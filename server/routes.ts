import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertMessageSchema, 
  insertFileSchema,
  insertFileShareSchema,
  insertFileShareAccessSchema,
  insertFileAccessLogSchema,
  insertMessageAcknowledgmentSchema,
  insertRetentionPolicySchema,
  insertAccessLogSchema,
  insertAuditTrailSchema,
  insertComplianceReportSchema,
  MessageClassification,
  UserRole,
  AccessAction
} from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "wizspeak-secure-secret-key-2025";

// File upload configuration
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// WebSocket connection map
const wsConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({ message: "Invalid token" });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          department: user.department,
        },
        token,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update online status
      await storage.updateUserOnlineStatus(user.id, true);

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          department: user.department,
        },
        token,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      await storage.updateUserOnlineStatus(req.user.id, false);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User routes
  app.get("/api/user/profile", authenticateToken, async (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role,
      department: req.user.department,
      isOnline: req.user.isOnline,
    });
  });

  // Conversation routes
  app.get("/api/conversations", authenticateToken, async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/conversations", authenticateToken, async (req, res) => {
    try {
      const { name, participantIds } = req.body;
      
      const conversation = await storage.createConversation({
        name,
        type: participantIds.length > 1 ? "group" : "direct",
      });

      // Add creator as participant
      await storage.addParticipant(conversation.id, req.user.id);
      
      // Add other participants
      for (const participantId of participantIds) {
        await storage.addParticipant(conversation.id, participantId);
      }

      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/conversations/:id", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationWithParticipants(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(p => p.user.id === req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getMessages(conversationId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/conversations/:id/messages", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: req.user.id,
      });

      const message = await storage.createMessage(messageData);
      
      // Broadcast to WebSocket clients
      const messageWithSender = {
        ...message,
        sender: req.user,
      };
      
      broadcastToConversation(conversationId, {
        type: "new_message",
        data: messageWithSender,
      });

      res.status(201).json(messageWithSender);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error: error.message });
    }
  });

  app.put("/api/messages/:id", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { content } = req.body;

      await storage.updateMessage(messageId, content);
      
      res.json({ message: "Message updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/messages/:id", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await storage.deleteMessage(messageId);
      
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // File upload route
  app.post("/api/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileExtension = path.extname(req.file.originalname);
      const filename = `${randomUUID()}${fileExtension}`;
      const newPath = path.join("uploads", filename);

      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);

      res.json({
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Get user files
  app.get("/api/files", authenticateToken, async (req, res) => {
    try {
      const files = await storage.getUserFiles(req.user.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to get files" });
    }
  });

  // Serve uploaded files
  app.use("/api/files/static", express.static("uploads"));

  // Compliance API routes
  
  // Message acknowledgment routes
  app.post("/api/messages/:id/acknowledge", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get("User-Agent");
      
      // Log access
      await storage.logAccess({
        userId,
        action: AccessAction.ACKNOWLEDGE,
        resourceType: "message",
        resourceId: messageId,
        ipAddress,
        userAgent
      });
      
      // Create audit trail
      await storage.createAuditTrail({
        eventType: "message_acknowledged",
        userId,
        resourceType: "message",
        resourceId: messageId,
        newValues: { acknowledgedBy: userId, acknowledgedAt: new Date() },
        ipAddress,
        userAgent
      });
      
      const acknowledgment = await storage.acknowledgeMessage(messageId, userId, ipAddress, userAgent);
      res.json(acknowledgment);
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge message" });
    }
  });
  
  app.get("/api/messages/:id/acknowledgments", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const acknowledgments = await storage.getMessageAcknowledgments(messageId);
      res.json(acknowledgments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get acknowledgments" });
    }
  });

  // Retention policy routes
  app.post("/api/compliance/retention-policies", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.COMPLIANCE_OFFICER) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const policyData = insertRetentionPolicySchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const policy = await storage.createRetentionPolicy(policyData);
      
      // Create audit trail
      await storage.createAuditTrail({
        eventType: "retention_policy_created",
        userId: req.user.id,
        resourceType: "retention_policy",
        resourceId: policy.id,
        newValues: policyData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      
      res.status(201).json(policy);
    } catch (error) {
      res.status(500).json({ message: "Failed to create retention policy" });
    }
  });
  
  app.get("/api/compliance/retention-policies", authenticateToken, async (req, res) => {
    try {
      const policies = await storage.getRetentionPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ message: "Failed to get retention policies" });
    }
  });

  // Access logs routes
  app.get("/api/compliance/access-logs", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.COMPLIANCE_OFFICER && req.user.role !== UserRole.AUDITOR) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const { resourceId, resourceType, limit } = req.query;
      
      if (!resourceId || !resourceType) {
        return res.status(400).json({ message: "resourceId and resourceType are required" });
      }
      
      const logs = await storage.getAccessLogs(
        parseInt(resourceId as string),
        resourceType as string,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get access logs" });
    }
  });

  // Audit trail routes
  app.get("/api/compliance/audit-trail", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.COMPLIANCE_OFFICER && req.user.role !== UserRole.AUDITOR) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const { userId, resourceType, eventType, dateFrom, dateTo, limit } = req.query;
      
      const filters = {
        userId: userId ? parseInt(userId as string) : undefined,
        resourceType: resourceType as string,
        eventType: eventType as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };
      
      const auditTrail = await storage.getAuditTrail(filters, limit ? parseInt(limit as string) : undefined);
      res.json(auditTrail);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit trail" });
    }
  });

  // Compliance reports routes
  app.post("/api/compliance/reports", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.COMPLIANCE_OFFICER) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const reportData = insertComplianceReportSchema.parse({
        ...req.body,
        generatedBy: req.user.id
      });
      
      const report = await storage.createComplianceReport(reportData);
      
      // Create audit trail
      await storage.createAuditTrail({
        eventType: "compliance_report_generated",
        userId: req.user.id,
        resourceType: "compliance_report",
        resourceId: report.id,
        newValues: reportData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      
      res.status(201).json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to create compliance report" });
    }
  });
  
  app.get("/api/compliance/reports", authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.COMPLIANCE_OFFICER && req.user.role !== UserRole.AUDITOR) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const { type, limit } = req.query;
      const reports = await storage.getComplianceReports(type as string, limit ? parseInt(limit as string) : undefined);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to get compliance reports" });
    }
  });

  // Enhanced message creation with compliance features
  app.post("/api/messages", authenticateToken, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
        contentHash: crypto.createHash('sha256').update(req.body.content).digest('hex')
      });
      
      const message = await storage.createMessage(messageData);
      
      // Create audit trail
      await storage.createAuditTrail({
        eventType: "message_sent",
        userId: req.user.id,
        resourceType: "message",
        resourceId: message.id,
        newValues: messageData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      
      // Log access
      await storage.logAccess({
        userId: req.user.id,
        action: "create",
        resourceType: "message",
        resourceId: message.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      
      // Get the message with sender info
      const messageWithSender = await storage.getMessages(message.conversationId, 1);
      const newMessage = messageWithSender.find(m => m.id === message.id);
      
      if (newMessage) {
        // Broadcast to conversation participants
        broadcastToConversation(message.conversationId, {
          type: "new_message",
          data: newMessage,
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // AI-powered endpoints
  app.post("/api/ai/summarize", authenticateToken, async (req, res) => {
    try {
      const { conversationId, messageCount = 10 } = req.body;
      
      // Get recent messages from the conversation
      const messages = await storage.getMessages(conversationId, messageCount);
      
      if (messages.length === 0) {
        return res.json({
          summary: "No messages to summarize",
          keyPoints: [],
          actionItems: [],
          sentiment: "neutral",
          confidenceScore: 1.0
        });
      }
      
      // Generate AI summary (simplified implementation)
      const messageTexts = messages.map(m => m.content).join(" ");
      const wordCount = messageTexts.split(" ").length;
      const hasQuestions = messageTexts.includes("?");
      const hasUrgentWords = /urgent|asap|important|priority/i.test(messageTexts);
      
      // Simple sentiment analysis
      const positiveWords = ["good", "great", "excellent", "thanks", "appreciate"];
      const negativeWords = ["problem", "issue", "error", "wrong", "bad"];
      const positiveCount = positiveWords.filter(word => messageTexts.toLowerCase().includes(word)).length;
      const negativeCount = negativeWords.filter(word => messageTexts.toLowerCase().includes(word)).length;
      
      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      if (positiveCount > negativeCount) sentiment = "positive";
      else if (negativeCount > positiveCount) sentiment = "negative";
      
      const summary = {
        summary: wordCount > 50 ? 
          "The conversation covers multiple topics with active participation from both parties." :
          "Brief exchange of messages between participants.",
        keyPoints: hasQuestions ? ["Questions were asked requiring responses"] : ["General discussion"],
        actionItems: hasUrgentWords ? ["Priority items mentioned - follow up required"] : [],
        sentiment,
        confidenceScore: 0.75
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.post("/api/ai/smart-replies", authenticateToken, async (req, res) => {
    try {
      const { conversationId, lastMessageId } = req.body;
      
      // Get the last message
      const messages = await storage.getMessages(conversationId, 1);
      if (messages.length === 0) {
        return res.json([]);
      }
      
      const lastMessage = messages[0];
      const content = lastMessage.content.toLowerCase();
      
      // Generate contextual smart replies
      const smartReplies = [];
      
      if (content.includes("?")) {
        smartReplies.push({
          id: "reply_1",
          content: "Let me check on that and get back to you.",
          type: "detailed",
          confidence: 0.9,
          tone: "professional"
        });
        smartReplies.push({
          id: "reply_2",
          content: "Could you provide more details about this?",
          type: "question",
          confidence: 0.8,
          tone: "friendly"
        });
      }
      
      if (content.includes("thank") || content.includes("appreciate")) {
        smartReplies.push({
          id: "reply_3",
          content: "You're welcome! Happy to help.",
          type: "quick",
          confidence: 0.95,
          tone: "friendly"
        });
      }
      
      if (content.includes("urgent") || content.includes("asap")) {
        smartReplies.push({
          id: "reply_4",
          content: "I understand this is urgent. I'll prioritize this right away.",
          type: "confirmation",
          confidence: 0.9,
          tone: "professional"
        });
      }
      
      // Default replies if no specific context
      if (smartReplies.length === 0) {
        smartReplies.push(
          {
            id: "default_1",
            content: "Got it, thanks!",
            type: "quick",
            confidence: 0.7,
            tone: "casual"
          },
          {
            id: "default_2",
            content: "I'll look into this and update you soon.",
            type: "detailed",
            confidence: 0.8,
            tone: "professional"
          }
        );
      }
      
      res.json(smartReplies);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate smart replies" });
    }
  });

  app.get("/api/ai/insights/:conversationId", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getMessages(conversationId, 50);
      
      if (messages.length === 0) {
        return res.json({
          totalMessages: 0,
          averageResponseTime: 0,
          topicsDiscussed: [],
          communicationPattern: "No activity",
          lastActiveTime: new Date().toISOString()
        });
      }
      
      // Calculate insights
      const totalMessages = messages.length;
      const messageTexts = messages.map(m => m.content).join(" ");
      const words = messageTexts.split(" ");
      
      // Simple topic extraction
      const commonWords = words
        .filter(word => word.length > 4)
        .reduce((acc, word) => {
          acc[word.toLowerCase()] = (acc[word.toLowerCase()] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
      const topicsDiscussed = Object.entries(commonWords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
      
      // Calculate response time (simplified)
      const messageTimes = messages.map(m => new Date(m.createdAt).getTime());
      const timeDiffs = [];
      for (let i = 1; i < messageTimes.length; i++) {
        timeDiffs.push(messageTimes[i] - messageTimes[i-1]);
      }
      const averageResponseTime = timeDiffs.length > 0 ? 
        Math.round(timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length / 60000) : 0;
      
      const insights = {
        totalMessages,
        averageResponseTime,
        topicsDiscussed,
        communicationPattern: totalMessages > 20 ? "Very active" : totalMessages > 10 ? "Active" : "Light activity",
        lastActiveTime: messages[0]?.createdAt || new Date().toISOString()
      };
      
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // File Management Routes
  app.post("/api/files/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { encryptedKey, iv, category, messageId } = req.body;
      
      if (!encryptedKey || !iv) {
        return res.status(400).json({ message: "Encryption data required" });
      }

      // Generate unique filename for storage
      const fileExtension = path.extname(req.file.originalname);
      const storageFilename = `${randomUUID()}${fileExtension}`;
      const storagePath = path.join("uploads", storageFilename);

      // Move uploaded file to final location
      fs.renameSync(req.file.path, storagePath);

      // Calculate file hash for integrity
      const fileBuffer = fs.readFileSync(storagePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Create file record
      const fileData = insertFileSchema.parse({
        messageId: messageId ? parseInt(messageId) : null,
        filename: storageFilename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        encryptedKey,
        fileHash,
        iv,
        category: category || getFileCategory(req.file.mimetype),
        uploadedBy: req.user.id,
        storageUrl: storagePath
      });

      const file = await storage.createFile(fileData);

      res.json({ 
        message: "File uploaded successfully",
        file: {
          id: file.id,
          filename: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          category: file.category,
          uploadedAt: file.createdAt
        }
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  app.post("/api/files/:fileId/share", authenticateToken, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const shareData = insertFileShareSchema.parse({
        ...req.body,
        fileId,
        createdBy: req.user.id
      });

      // Generate unique share ID
      const shareId = randomUUID();
      
      const fileShare = await storage.createFileShare({
        ...shareData,
        shareId
      });

      res.json({
        message: "File share created successfully",
        share: {
          shareId: fileShare.shareId,
          shareUrl: `${req.protocol}://${req.get('host')}/share/${fileShare.shareId}`,
          permissions: {
            canView: fileShare.canView,
            canDownload: fileShare.canDownload,
            canShare: fileShare.canShare
          },
          expiresAt: fileShare.expiresAt,
          createdAt: fileShare.createdAt
        }
      });
    } catch (error) {
      console.error("File share creation error:", error);
      res.status(500).json({ message: "Failed to create file share" });
    }
  });

  app.get("/api/files/:fileId/download", authenticateToken, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const { shareId } = req.query;

      // Get file
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check permissions (simplified for now)
      if (file.uploadedBy !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if file exists on disk
      if (!fs.existsSync(file.storageUrl)) {
        return res.status(404).json({ message: "File not found on storage" });
      }

      // Send encrypted file with headers for client-side decryption
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('X-Encryption-Key', file.encryptedKey);
      res.setHeader('X-Encryption-IV', file.iv);
      
      const fileStream = fs.createReadStream(file.storageUrl);
      fileStream.pipe(res);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "File download failed" });
    }
  });

  // Helper function to determine file category
  function getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let userId: number | null = null;

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "auth") {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET) as { userId: number };
            userId = decoded.userId;
            wsConnections.set(userId, ws);
            
            // Update user online status
            await storage.updateUserOnlineStatus(userId, true);
            
            ws.send(JSON.stringify({ type: "auth_success" }));
          } catch (error) {
            ws.send(JSON.stringify({ type: "auth_error", message: "Invalid token" }));
          }
        } else if (data.type === "typing") {
          if (userId) {
            broadcastToConversation(data.conversationId, {
              type: "typing",
              data: { userId, isTyping: data.isTyping },
            }, userId);
          }
        } else if (data.type === "call_offer") {
          // WebRTC call offer signaling
          if (userId && data.to) {
            const targetWs = wsConnections.get(data.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call_offer",
                payload: {
                  from: userId,
                  to: data.to,
                  type: data.callType,
                  offer: data.offer
                }
              }));
            }
          }
        } else if (data.type === "call_answer") {
          // WebRTC call answer signaling
          if (userId && data.to) {
            const targetWs = wsConnections.get(data.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call_answer",
                payload: {
                  from: userId,
                  to: data.to,
                  answer: data.answer
                }
              }));
            }
          }
        } else if (data.type === "ice_candidate") {
          // WebRTC ICE candidate signaling
          if (userId && data.to) {
            const targetWs = wsConnections.get(data.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "ice_candidate",
                payload: {
                  from: userId,
                  to: data.to,
                  candidate: data.candidate
                }
              }));
            }
          }
        } else if (data.type === "call_ended") {
          // WebRTC call ended signaling
          if (userId && data.to) {
            const targetWs = wsConnections.get(data.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call_ended",
                payload: {
                  from: userId,
                  to: data.to
                }
              }));
            }
          }
        } else if (data.type === "call_rejected") {
          // WebRTC call rejected signaling
          if (userId && data.to) {
            const targetWs = wsConnections.get(data.to);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call_rejected",
                payload: {
                  from: userId,
                  to: data.to
                }
              }));
            }
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", async () => {
      if (userId) {
        wsConnections.delete(userId);
        await storage.updateUserOnlineStatus(userId, false);
      }
    });
  });

  function broadcastToConversation(conversationId: number, message: any, excludeUserId?: number) {
    // In a real implementation, you'd track which users are in which conversations
    // For now, broadcast to all connected users
    wsConnections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN && userId !== excludeUserId) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
