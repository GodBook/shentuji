import { z } from "zod";
import { MAX_KEYWORD_LENGTH, MAX_KEYWORDS_PER_IMAGE } from "@/lib/keywords";

export const passwordSchema = z
  .string()
  .min(10, "密码至少需要 10 个字符")
  .max(256, "密码过长");

export const authBodySchema = z.object({ password: passwordSchema });

export const keywordArraySchema = z
  .array(z.string().max(MAX_KEYWORD_LENGTH * 2))
  .max(MAX_KEYWORDS_PER_IMAGE);

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, "请输入分组名称")
  .max(40, "分组名称不能超过 40 个字符");

export const groupBodySchema = z.object({ name: groupNameSchema });

export const imageUpdateSchema = z.object({
  keywords: keywordArraySchema.optional(),
  groupId: z.string().uuid().nullable().optional(),
  favorite: z.boolean().optional(),
  rating: z.number().int().min(0).max(5).optional(),
});

export const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addKeywords"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
    keywords: keywordArraySchema.min(1),
  }),
  z.object({
    action: z.literal("removeKeywords"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
    keywords: keywordArraySchema.min(1),
  }),
  z.object({
    action: z.literal("moveGroup"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
    groupId: z.string().uuid().nullable(),
  }),
  z.object({
    action: z.literal("setFavorite"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
    favorite: z.boolean(),
  }),
  z.object({
    action: z.literal("setRating"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
    rating: z.number().int().min(0).max(5),
  }),
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
  }),
  z.object({
    action: z.literal("restore"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
  }),
  z.object({
    action: z.literal("deletePermanent"),
    ids: z.array(z.string().uuid()).min(1).max(10_000),
  }),
]);
