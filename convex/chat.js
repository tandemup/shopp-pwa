// convex/chat.js
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_ROOM = "compras";
const DEFAULT_USERNAME = "anonymous";
const MAX_MESSAGE_LENGTH = 280;
const MAX_USERNAME_LENGTH = 40;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanRoom(value) {
  return String(value || "").trim().toLowerCase().slice(0, 50) || DEFAULT_ROOM;
}
function cleanUsername(value) {
  return String(value || "").trim().slice(0, MAX_USERNAME_LENGTH) || DEFAULT_USERNAME;
}
function cleanText(value) {
  return String(value || "").trim();
}

export const listMessages = query({
  args: { room: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const room = cleanRoom(args.room);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    const now = Date.now();
    const messages = await ctx.db.query("chatMessages").withIndex("by_room_createdAt", q => q.eq("room", room)).order("desc").take(limit);
    return messages.filter(message => message.status !== "blocked" && message.status !== "hidden" && (!message.expiresAt || message.expiresAt > now)).reverse();
  },
});

export const sendMessage = mutation({
  args: { room: v.optional(v.string()), username: v.optional(v.string()), text: v.string() },
  handler: async (ctx, args) => {
    const room = cleanRoom(args.room);
    const username = cleanUsername(args.username);
    const text = cleanText(args.text);
    if (!text) throw new Error("El mensaje no puede estar vacío.");
    if (text.length > MAX_MESSAGE_LENGTH) throw new Error(`El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`);
    const now = Date.now();
    const messageId = await ctx.db.insert("chatMessages", { room, username, text, createdAt: now, expiresAt: now + MESSAGE_TTL_MS, status: "visible", messageStatus: "clean" });
    return { ok: true, messageId };
  },
});

export const deleteExpiredMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db.query("chatMessages").withIndex("by_expiresAt", q => q.lte("expiresAt", now)).collect();
    for (const message of expired) await ctx.db.delete(message._id);
    return { ok: true, deleted: expired.length };
  },
});
