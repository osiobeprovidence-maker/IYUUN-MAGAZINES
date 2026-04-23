import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const normalizeCategoryName = (name: string) => name.trim().replace(/\s+/g, " ").toUpperCase();
const slugifyCategory = (name: string) =>
  normalizeCategoryName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").order("asc").take(100);
    return categories.map((category) => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedName = normalizeCategoryName(args.name);
    const slug = slugifyCategory(args.name);

    if (!slug) {
      throw new Error("Category name must include letters or numbers.");
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      return {
        id: existing._id,
        name: existing.name,
        slug: existing.slug,
      };
    }

    const id = await ctx.db.insert("categories", {
      slug,
      name: normalizedName,
    });

    return {
      id,
      name: normalizedName,
      slug,
    };
  },
});

export const remove = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.categoryId);
    return null;
  },
});

export const seedCoreTaxonomy = mutation({
  args: {
    names: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const inserted = [];

    for (const name of args.names) {
      const normalizedName = normalizeCategoryName(name);
      const slug = slugifyCategory(name);

      if (!slug) {
        continue;
      }

      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();

      if (existing) {
        continue;
      }

      const id = await ctx.db.insert("categories", {
        slug,
        name: normalizedName,
      });

      inserted.push({ id, name: normalizedName, slug });
    }

    return inserted;
  },
});
