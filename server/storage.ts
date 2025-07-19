import { 
  users, conversations, conversationParticipants, messages, files, fileShares, fileShareAccess, fileAccessLogs, messageAcknowledgments, retentionPolicies, accessLogs, auditTrails, complianceReports,
  type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type ConversationParticipant,
  type File, type InsertFile, type FileShare, type InsertFileShare, type FileShareAccess, type InsertFileShareAccess, type FileAccessLog, type InsertFileAccessLog,
  type MessageAcknowledgment, type InsertMessageAcknowledgment, type RetentionPolicy, type InsertRetentionPolicy,
  type AccessLog, type InsertAccessLog, type AuditTrail, type InsertAuditTrail, type ComplianceReport, type InsertComplianceReport
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void>;
  
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationWithParticipants(id: number): Promise<(Conversation & { participants: (ConversationParticipant & { user: User })[] }) | undefined>;
  getUserConversations(userId: number): Promise<(Conversation & { participants: (ConversationParticipant & { user: User })[], lastMessage?: Message & { sender: User } })[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addParticipant(conversationId: number, userId: number): Promise<void>;
  
  // Message operations
  getMessages(conversationId: number, limit?: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, content: string): Promise<void>;
  deleteMessage(id: number): Promise<void>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getUserFiles(userId: number): Promise<File[]>;
  
  // File sharing operations
  createFileShare(share: InsertFileShare): Promise<FileShare>;
  getFileShare(id: number): Promise<FileShare | undefined>;
  getFileShareByShareId(shareId: string): Promise<FileShare | undefined>;
  getFileShares(fileId: number): Promise<FileShare[]>;
  revokeFileShare(shareId: string): Promise<void>;
  incrementShareViews(shareId: number): Promise<void>;
  
  // File access control
  createFileShareAccess(access: InsertFileShareAccess): Promise<FileShareAccess>;
  getFileShareAccess(shareId: number, userId: number): Promise<FileShareAccess | undefined>;
  
  // File access logging
  createFileAccessLog(log: InsertFileAccessLog): Promise<FileAccessLog>;
  getFileAccessLogs(fileId: number, limit?: number): Promise<(FileAccessLog & { user: User })[]>;
  
  // Compliance operations
  acknowledgeMessage(messageId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<MessageAcknowledgment>;
  getMessageAcknowledgments(messageId: number): Promise<(MessageAcknowledgment & { user: User })[]>;
  
  // Retention policy operations
  createRetentionPolicy(policy: InsertRetentionPolicy): Promise<RetentionPolicy>;
  getRetentionPolicies(): Promise<RetentionPolicy[]>;
  updateRetentionPolicy(id: number, policy: Partial<InsertRetentionPolicy>): Promise<void>;
  
  // Access logging
  logAccess(log: InsertAccessLog): Promise<AccessLog>;
  getAccessLogs(resourceId: number, resourceType: string, limit?: number): Promise<(AccessLog & { user: User })[]>;
  
  // Audit trail
  createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail>;
  getAuditTrail(filters: { userId?: number; resourceType?: string; eventType?: string; dateFrom?: Date; dateTo?: Date }, limit?: number): Promise<(AuditTrail & { user: User })[]>;
  
  // Compliance reports
  createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport>;
  getComplianceReports(type?: string, limit?: number): Promise<(ComplianceReport & { generator: User })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isOnline, lastSeen: new Date() })
      .where(eq(users.id, id));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationWithParticipants(id: number): Promise<(Conversation & { participants: (ConversationParticipant & { user: User })[] }) | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    if (!conversation) return undefined;

    const participants = await db
      .select()
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, id));

    return {
      ...conversation,
      participants: participants.map(p => ({
        ...p.conversation_participants,
        user: p.users
      }))
    };
  }

  async getUserConversations(userId: number): Promise<(Conversation & { participants: (ConversationParticipant & { user: User })[], lastMessage?: Message & { sender: User } })[]> {
    const userConversations = await db
      .select()
      .from(conversationParticipants)
      .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    const conversationData = await Promise.all(
      userConversations.map(async (uc) => {
        const participants = await db
          .select()
          .from(conversationParticipants)
          .innerJoin(users, eq(conversationParticipants.userId, users.id))
          .where(eq(conversationParticipants.conversationId, uc.conversations.id));

        const [lastMessage] = await db
          .select()
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.conversationId, uc.conversations.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          ...uc.conversations,
          participants: participants.map(p => ({
            ...p.conversation_participants,
            user: p.users
          })),
          lastMessage: lastMessage ? {
            ...lastMessage.messages,
            sender: lastMessage.users
          } : undefined
        };
      })
    );

    return conversationData;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async addParticipant(conversationId: number, userId: number): Promise<void> {
    await db
      .insert(conversationParticipants)
      .values({ conversationId, userId });
  }

  async getMessages(conversationId: number, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const result = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.conversationId, conversationId), eq(messages.isDeleted, false)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.map(r => ({
      ...r.messages,
      sender: r.users
    })).reverse();
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    
    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async updateMessage(id: number, content: string): Promise<void> {
    await db
      .update(messages)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(messages.id, id));
  }

  async deleteMessage(id: number): Promise<void> {
    await db
      .update(messages)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(messages.id, id));
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));

    if (message) {
      const readBy = Array.isArray(message.readBy) ? message.readBy : [];
      if (!readBy.includes(userId)) {
        await db
          .update(messages)
          .set({ readBy: [...readBy, userId] })
          .where(eq(messages.id, messageId));
      }
    }
  }

  // File operations
  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db
      .insert(files)
      .values(file)
      .returning();
    return newFile;
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async getUserFiles(userId: number): Promise<File[]> {
    return await db.select().from(files).where(eq(files.uploadedBy, userId)).orderBy(desc(files.createdAt));
  }

  // File sharing operations
  async createFileShare(share: InsertFileShare): Promise<FileShare> {
    const [newShare] = await db
      .insert(fileShares)
      .values(share)
      .returning();
    return newShare;
  }

  async getFileShare(id: number): Promise<FileShare | undefined> {
    const [share] = await db.select().from(fileShares).where(eq(fileShares.id, id));
    return share || undefined;
  }

  async getFileShareByShareId(shareId: string): Promise<FileShare | undefined> {
    const [share] = await db.select().from(fileShares).where(eq(fileShares.shareId, shareId));
    return share || undefined;
  }

  async getFileShares(fileId: number): Promise<FileShare[]> {
    return await db.select().from(fileShares).where(eq(fileShares.fileId, fileId)).orderBy(desc(fileShares.createdAt));
  }

  async revokeFileShare(shareId: string): Promise<void> {
    await db.update(fileShares)
      .set({ isActive: false })
      .where(eq(fileShares.shareId, shareId));
  }

  async incrementShareViews(shareId: number): Promise<void> {
    const { sql } = await import("drizzle-orm");
    await db.update(fileShares)
      .set({ currentViews: sql`${fileShares.currentViews} + 1` })
      .where(eq(fileShares.id, shareId));
  }

  // File access control
  async createFileShareAccess(access: InsertFileShareAccess): Promise<FileShareAccess> {
    const [newAccess] = await db
      .insert(fileShareAccess)
      .values(access)
      .returning();
    return newAccess;
  }

  async getFileShareAccess(shareId: number, userId: number): Promise<FileShareAccess | undefined> {
    const [access] = await db.select()
      .from(fileShareAccess)
      .where(and(eq(fileShareAccess.shareId, shareId), eq(fileShareAccess.userId, userId)));
    return access || undefined;
  }

  // File access logging
  async createFileAccessLog(log: InsertFileAccessLog): Promise<FileAccessLog> {
    const [newLog] = await db
      .insert(fileAccessLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getFileAccessLogs(fileId: number, limit: number = 50): Promise<(FileAccessLog & { user: User })[]> {
    return await db.select({
      id: fileAccessLogs.id,
      fileId: fileAccessLogs.fileId,
      shareId: fileAccessLogs.shareId,
      userId: fileAccessLogs.userId,
      action: fileAccessLogs.action,
      ipAddress: fileAccessLogs.ipAddress,
      userAgent: fileAccessLogs.userAgent,
      metadata: fileAccessLogs.metadata,
      timestamp: fileAccessLogs.timestamp,
      user: users
    })
    .from(fileAccessLogs)
    .leftJoin(users, eq(fileAccessLogs.userId, users.id))
    .where(eq(fileAccessLogs.fileId, fileId))
    .orderBy(desc(fileAccessLogs.timestamp))
    .limit(limit);
  }

  // Compliance operations
  async acknowledgeMessage(messageId: number, userId: number, ipAddress?: string, userAgent?: string): Promise<MessageAcknowledgment> {
    const [acknowledgment] = await db
      .insert(messageAcknowledgments)
      .values({ messageId, userId, ipAddress, userAgent })
      .returning();
    return acknowledgment;
  }

  async getMessageAcknowledgments(messageId: number): Promise<(MessageAcknowledgment & { user: User })[]> {
    const result = await db
      .select()
      .from(messageAcknowledgments)
      .innerJoin(users, eq(messageAcknowledgments.userId, users.id))
      .where(eq(messageAcknowledgments.messageId, messageId))
      .orderBy(desc(messageAcknowledgments.acknowledgedAt));

    return result.map(r => ({
      ...r.message_acknowledgments,
      user: r.users
    }));
  }

  // Retention policy operations
  async createRetentionPolicy(policy: InsertRetentionPolicy): Promise<RetentionPolicy> {
    const [newPolicy] = await db
      .insert(retentionPolicies)
      .values(policy)
      .returning();
    return newPolicy;
  }

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return await db
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.isActive, true))
      .orderBy(desc(retentionPolicies.createdAt));
  }

  async updateRetentionPolicy(id: number, policy: Partial<InsertRetentionPolicy>): Promise<void> {
    await db
      .update(retentionPolicies)
      .set(policy)
      .where(eq(retentionPolicies.id, id));
  }

  // Access logging
  async logAccess(log: InsertAccessLog): Promise<AccessLog> {
    const [newLog] = await db
      .insert(accessLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getAccessLogs(resourceId: number, resourceType: string, limit: number = 100): Promise<(AccessLog & { user: User })[]> {
    const result = await db
      .select()
      .from(accessLogs)
      .innerJoin(users, eq(accessLogs.userId, users.id))
      .where(and(
        eq(accessLogs.resourceId, resourceId),
        eq(accessLogs.resourceType, resourceType)
      ))
      .orderBy(desc(accessLogs.timestamp))
      .limit(limit);

    return result.map(r => ({
      ...r.access_logs,
      user: r.users
    }));
  }

  // Audit trail
  async createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail> {
    const [newAudit] = await db
      .insert(auditTrails)
      .values(audit)
      .returning();
    return newAudit;
  }

  async getAuditTrail(filters: { userId?: number; resourceType?: string; eventType?: string; dateFrom?: Date; dateTo?: Date }, limit: number = 1000): Promise<(AuditTrail & { user: User })[]> {
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(auditTrails.userId, filters.userId));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditTrails.resourceType, filters.resourceType));
    }
    if (filters.eventType) {
      conditions.push(eq(auditTrails.eventType, filters.eventType));
    }
    // Add date range filtering logic here if needed

    const result = await db
      .select()
      .from(auditTrails)
      .innerJoin(users, eq(auditTrails.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditTrails.timestamp))
      .limit(limit);

    return result.map(r => ({
      ...r.audit_trails,
      user: r.users
    }));
  }

  // Compliance reports
  async createComplianceReport(report: InsertComplianceReport): Promise<ComplianceReport> {
    const [newReport] = await db
      .insert(complianceReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getComplianceReports(type?: string, limit: number = 50): Promise<(ComplianceReport & { generator: User })[]> {
    const result = await db
      .select()
      .from(complianceReports)
      .innerJoin(users, eq(complianceReports.generatedBy, users.id))
      .where(type ? eq(complianceReports.reportType, type) : undefined)
      .orderBy(desc(complianceReports.generatedAt))
      .limit(limit);

    return result.map(r => ({
      ...r.compliance_reports,
      generator: r.users
    }));
  }
}

export const storage = new DatabaseStorage();
