import { db } from "./server/db";
import { eq } from "drizzle-orm";
import { 
  users, 
  conversations, 
  conversationParticipants, 
  messages,
  stories,
  storyViews,
  userBlocks,
  files,
  fileShares,
  fileShareAccess,
  fileAccessLogs,
  messageAcknowledgments,
  retentionPolicies,
  accessLogs,
  auditTrails,
  complianceReports,
  passwordResetTokens
} from "./shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Starting seed process...");

  try {
    // Clear existing data in proper order to avoid foreign key constraints
    await db.delete(passwordResetTokens);
    await db.delete(complianceReports);
    await db.delete(auditTrails);
    await db.delete(accessLogs);
    await db.delete(retentionPolicies);
    await db.delete(messageAcknowledgments);
    await db.delete(fileAccessLogs);
    await db.delete(fileShareAccess);
    await db.delete(fileShares);
    await db.delete(files);
    await db.delete(storyViews);
    await db.delete(stories);
    await db.delete(userBlocks);
    await db.delete(messages);
    await db.delete(conversationParticipants);
    await db.delete(conversations);
    await db.delete(users);
    
    console.log("🗑️  Cleared existing data");

    // Create users
    const hashedPassword = await bcrypt.hash("password", 10);
    const adminPassword = await bcrypt.hash("NewSecurePassword2025!", 10);

    const seedUsers = [
      {
        username: "testuser",
        email: "test@example.com",
        password: hashedPassword,
        role: "user" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
        department: "Development"
      },
      {
        username: "calvarado",
        email: "calvarado@nebusis.com", 
        password: adminPassword,
        role: "admin" as const,
        avatar: "/attached_assets/Celso Professional_1752971797358.jpg",
        department: "Executive Leadership"
      },
      {
        username: "dzambrano",
        email: "dzambrano@nebusis.com",
        password: adminPassword,
        role: "admin" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dzambrano", 
        department: "Executive Leadership"
      },
      {
        username: "alice",
        email: "alice@example.com",
        password: hashedPassword,
        role: "user" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
        department: "Marketing"
      },
      {
        username: "bob",
        email: "bob@example.com",
        password: hashedPassword,
        role: "user" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
        department: "Sales"
      },
      {
        username: "charlie",
        email: "charlie@example.com",
        password: hashedPassword,
        role: "user" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
        department: "Engineering"
      },
      {
        username: "blockeduser",
        email: "blocked@example.com",
        password: hashedPassword,
        role: "user" as const,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=blockeduser",
        department: "Support"
      }
    ];

    const insertedUsers = await db.insert(users).values(seedUsers).returning();
    console.log(`👥 Created ${insertedUsers.length} users`);

    // Ban the test user to demonstrate admin functionality
    await db.update(users)
      .set({
        isBanned: true,
        bannedAt: new Date(),
        bannedBy: insertedUsers[1].id, // calvarado (admin)
        banReason: "Violation of community guidelines - demo ban"
      })
      .where(eq(users.username, "blockeduser"));
    
    console.log("🔨 Banned test user for demo purposes");

    // Create stories
    const storyData = [
      {
        userId: insertedUsers[0].id, // testuser
        mediaType: "text" as const,
        caption: "Welcome to WizSpeek! Check out our new Stories feature 🎉",
        backgroundColor: "#2E5A87",
        visibility: "public" as const,
        hiddenFromUsers: [],
        mediaUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        userId: insertedUsers[3].id, // alice
        mediaType: "text" as const,
        caption: "Just launched our new marketing campaign! So excited to see the results.",
        backgroundColor: "#E74C3C",
        visibility: "public" as const,
        hiddenFromUsers: [],
        mediaUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        userId: insertedUsers[4].id, // bob
        mediaType: "text" as const,
        caption: "Closed 3 deals today! Team work makes the dream work 💪",
        backgroundColor: "#27AE60",
        visibility: "public" as const,
        hiddenFromUsers: [],
        mediaUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        userId: insertedUsers[5].id, // charlie
        mediaType: "text" as const,
        caption: "Working on some exciting new features. Stay tuned! 🚀",
        backgroundColor: "#8E44AD",
        visibility: "public" as const,
        hiddenFromUsers: [],
        mediaUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        userId: insertedUsers[1].id, // calvarado (admin)
        mediaType: "text" as const,
        caption: "Admin announcement: New compliance features now live! 📋",
        backgroundColor: "#F39C12",
        visibility: "public" as const,
        hiddenFromUsers: [],
        mediaUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ];

    const insertedStories = await db.insert(stories).values(storyData).returning();
    console.log(`📖 Created ${insertedStories.length} stories`);

    // Create story views (simulating "seen by" functionality)
    const storyViewData = [
      // testuser's story viewed by alice, bob, charlie
      { storyId: insertedStories[0].id, viewerId: insertedUsers[3].id },
      { storyId: insertedStories[0].id, viewerId: insertedUsers[4].id },
      { storyId: insertedStories[0].id, viewerId: insertedUsers[5].id },
      
      // alice's story viewed by testuser, bob
      { storyId: insertedStories[1].id, viewerId: insertedUsers[0].id },
      { storyId: insertedStories[1].id, viewerId: insertedUsers[4].id },
      
      // bob's story viewed by alice, charlie
      { storyId: insertedStories[2].id, viewerId: insertedUsers[3].id },
      { storyId: insertedStories[2].id, viewerId: insertedUsers[5].id },
      
      // charlie's story viewed by testuser
      { storyId: insertedStories[3].id, viewerId: insertedUsers[0].id },
      
      // admin story viewed by everyone
      { storyId: insertedStories[4].id, viewerId: insertedUsers[0].id },
      { storyId: insertedStories[4].id, viewerId: insertedUsers[3].id },
      { storyId: insertedStories[4].id, viewerId: insertedUsers[4].id },
      { storyId: insertedStories[4].id, viewerId: insertedUsers[5].id }
    ];

    const insertedStoryViews = await db.insert(storyViews).values(storyViewData).returning();
    console.log(`👁️  Created ${insertedStoryViews.length} story views`);

    // Create user blocks (Instagram-style blocking)
    const blockData = [
      {
        blockerId: insertedUsers[0].id, // testuser blocks blockeduser
        blockedId: insertedUsers[6].id,
        reason: "Inappropriate messages"
      },
      {
        blockerId: insertedUsers[3].id, // alice blocks charlie
        blockedId: insertedUsers[5].id,
        reason: "Personal conflict"
      }
    ];

    const insertedBlocks = await db.insert(userBlocks).values(blockData).returning();
    console.log(`🚫 Created ${insertedBlocks.length} user blocks`);

    // Create conversations
    const conversationData = [
      {
        name: "General Discussion",
        type: "group" as const,
        createdBy: insertedUsers[0].id,
        isEncrypted: true
      },
      {
        name: "Admin Team",
        type: "group" as const,
        createdBy: insertedUsers[1].id,
        isEncrypted: true
      },
      {
        name: "Stories Feature Demo",
        type: "group" as const,
        createdBy: insertedUsers[0].id,
        isEncrypted: true
      },
      {
        name: null, // Direct message between calvarado and testuser
        type: "direct" as const,
        createdBy: insertedUsers[1].id, // calvarado
        isEncrypted: true
      },
      {
        name: null, // Direct message between calvarado and alice
        type: "direct" as const,
        createdBy: insertedUsers[1].id, // calvarado
        isEncrypted: true
      }
    ];

    const insertedConversations = await db.insert(conversations).values(conversationData).returning();
    console.log(`💬 Created ${insertedConversations.length} conversations`);

    // Create participants
    const participantData = [
      // General Discussion participants
      { conversationId: insertedConversations[0].id, userId: insertedUsers[0].id, role: "admin" as const },
      { conversationId: insertedConversations[0].id, userId: insertedUsers[3].id, role: "member" as const },
      { conversationId: insertedConversations[0].id, userId: insertedUsers[4].id, role: "member" as const },
      { conversationId: insertedConversations[0].id, userId: insertedUsers[5].id, role: "member" as const },
      
      // Admin Team participants
      { conversationId: insertedConversations[1].id, userId: insertedUsers[1].id, role: "admin" as const },
      { conversationId: insertedConversations[1].id, userId: insertedUsers[2].id, role: "admin" as const },
      
      // Stories Feature Demo participants
      { conversationId: insertedConversations[2].id, userId: insertedUsers[0].id, role: "admin" as const },
      { conversationId: insertedConversations[2].id, userId: insertedUsers[1].id, role: "member" as const },
      { conversationId: insertedConversations[2].id, userId: insertedUsers[3].id, role: "member" as const },
      
      // Direct message: calvarado and testuser
      { conversationId: insertedConversations[3].id, userId: insertedUsers[1].id, role: "member" as const }, // calvarado
      { conversationId: insertedConversations[3].id, userId: insertedUsers[0].id, role: "member" as const }, // testuser
      
      // Direct message: calvarado and alice
      { conversationId: insertedConversations[4].id, userId: insertedUsers[1].id, role: "member" as const }, // calvarado
      { conversationId: insertedConversations[4].id, userId: insertedUsers[3].id, role: "member" as const }, // alice
    ];

    const insertedParticipants = await db.insert(conversationParticipants).values(participantData).returning();
    console.log(`👥 Created ${insertedParticipants.length} participants`);

    // Create messages
    const messageData = [
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[0].id,
        content: "Hey everyone! 👋 Welcome to the new Stories feature demo! This is where we'll test the mandatory 'seen by' functionality.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[1].id,
        content: "Great work on implementing Stories! The 'seen by' tracking is working perfectly. Users can now see who viewed their stories.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[2].id,
        senderId: insertedUsers[3].id,
        content: "I love how it shows the view count and individual viewers! Very similar to Instagram Stories but with our WizSpeek branding 😊",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[1].id,
        senderId: insertedUsers[1].id,
        content: "Admin notice: New user management features are live. We can now ban/unban users and see detailed user analytics.",
        messageType: "text" as const,
        classification: "policy_notification" as const,
        priority: "high" as const,
        requiresAcknowledgment: true
      },
      {
        conversationId: insertedConversations[1].id,
        senderId: insertedUsers[2].id,
        content: "Perfect! The user blocking system is also working great. Users can block each other Instagram-style with reasons.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[3].id, // Direct message: calvarado -> testuser
        senderId: insertedUsers[1].id, // calvarado
        content: "Hi! Thanks for all the great testing work on WizSpeek®. The new features are looking fantastic.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[3].id, // Direct message: testuser -> calvarado
        senderId: insertedUsers[0].id, // testuser
        content: "Thank you! I'm excited about the Stories feature and the admin controls. Everything feels very professional.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[4].id, // Direct message: calvarado -> alice
        senderId: insertedUsers[1].id, // calvarado
        content: "Alice, could you help review the marketing materials for our WizSpeek® launch?",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      },
      {
        conversationId: insertedConversations[4].id, // Direct message: alice -> calvarado
        senderId: insertedUsers[3].id, // alice
        content: "Absolutely! I'll review them this afternoon and send you my feedback.",
        messageType: "text" as const,
        classification: "general" as const,
        priority: "normal" as const
      }
    ];

    const insertedMessages = await db.insert(messages).values(messageData).returning();
    console.log(`📨 Created ${insertedMessages.length} messages`);

    console.log("✅ Seed process completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Users: ${insertedUsers.length} (including 1 banned user)`);
    console.log(`   Stories: ${insertedStories.length} (with mandatory view tracking)`);
    console.log(`   Story Views: ${insertedStoryViews.length} ("seen by" records)`);
    console.log(`   User Blocks: ${insertedBlocks.length} (Instagram-style blocking)`);
    console.log(`   Conversations: ${insertedConversations.length} (3 groups + 2 direct messages)`);
    console.log(`   Messages: ${insertedMessages.length}`);
    
    console.log("\n🔑 Login credentials:");
    console.log("   Admin: calvarado / NewSecurePassword2025!");
    console.log("   Admin: dzambrano / NewSecurePassword2025!");
    console.log("   User: testuser / password");
    console.log("   User: alice / password");
    console.log("   User: bob / password");
    console.log("   User: charlie / password");
    console.log("   Banned: blockeduser / password");

  } catch (error) {
    console.error("❌ Seed process failed:", error);
    throw error;
  }
}

seed().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});