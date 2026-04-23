import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const toPublicComment = (comment: {
  _id: unknown;
  storyId: string;
  author: string;
  text: string;
  createdAt: number;
}) => ({
  id: String(comment._id),
  storyId: comment.storyId,
  author: comment.author,
  text: comment.text,
  createdAt: comment.createdAt,
});

export const listByStory = query({
  args: {
    storyId: v.string(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_storyId_and_createdAt", (q) => q.eq("storyId", args.storyId))
      .order("desc")
      .take(200);

    return comments.map(toPublicComment);
  },
});

export const create = mutation({
  args: {
    storyId: v.string(),
    author: v.string(),
    text: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("comments", args);
    const comment = await ctx.db.get(id);
    return comment ? toPublicComment(comment) : null;
  },
});
