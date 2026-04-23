import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const toPublicOrder = (order: {
  _id: unknown;
  userEmail: string;
  storyId: string;
  storyTitle: string;
  status: "pending" | "shipped" | "cancelled";
  createdAt: number;
}) => ({
  id: String(order._id),
  userEmail: order.userEmail,
  storyId: order.storyId,
  storyTitle: order.storyTitle,
  status: order.status,
  createdAt: order.createdAt,
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(200);
    return orders.map(toPublicOrder);
  },
});

export const create = mutation({
  args: {
    userEmail: v.string(),
    storyId: v.string(),
    storyTitle: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("orders", {
      ...args,
      status: "pending",
    });
    const order = await ctx.db.get(id);
    return order ? toPublicOrder(order) : null;
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(v.literal("pending"), v.literal("shipped"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { status: args.status });
    const order = await ctx.db.get(args.orderId);
    return order ? toPublicOrder(order) : null;
  },
});
