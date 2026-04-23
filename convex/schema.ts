import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
  }).index("by_slug", ["slug"]),
  ads: defineTable({
    adId: v.string(),
    partner: v.string(),
    headline: v.string(),
    copy: v.string(),
    image: v.optional(v.string()),
    video: v.optional(v.string()),
    link: v.string(),
    isActive: v.boolean(),
    type: v.union(v.literal("image"), v.literal("video")),
    createdAt: v.number(),
    clicks: v.optional(v.number()),
  }).index("by_adId", ["adId"]).index("by_createdAt", ["createdAt"]),
  comments: defineTable({
    storyId: v.string(),
    author: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_storyId_and_createdAt", ["storyId", "createdAt"]),
  orders: defineTable({
    userEmail: v.string(),
    storyId: v.string(),
    storyTitle: v.string(),
    status: v.union(v.literal("pending"), v.literal("shipped"), v.literal("cancelled")),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  users: defineTable({
    tokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    joined: v.string(),
    status: v.union(v.literal("active"), v.literal("banned")),
    editorStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("approved")),
    isPremium: v.boolean(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_role_and_joined", ["role", "joined"]),
  subscribers: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]).index("by_createdAt", ["createdAt"]),
  stories: defineTable({
    storyId: v.string(),
    category: v.string(),
    title: v.string(),
    excerpt: v.string(),
    content: v.optional(v.string()),
    image: v.optional(v.string()),
    video: v.optional(v.string()),
    aspect: v.union(v.literal("portrait"), v.literal("landscape"), v.literal("square")),
    type: v.union(v.literal("image"), v.literal("video")),
    date: v.string(),
    ownerId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    likesCount: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("changes_requested"),
    ),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
  })
    .index("by_storyId", ["storyId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),
});
