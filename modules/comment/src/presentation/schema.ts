import { z } from 'zod';

export const CreateCommentInputSchema = z.object({
  parentId: z.string().trim().optional().nullable(),
  authorName: z.string().trim().max(50, '署名不能超过50个字符').optional().nullable(),
  authorEmail: z
    .string()
    .trim()
    .email('请输入有效的邮箱地址')
    .optional()
    .nullable()
    .or(z.literal('')),
  authorUrl: z
    .string()
    .trim()
    .url('网站链接必须是合法的URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  content: z.string().trim().min(1, '评论内容不能为空').max(2000, '评论内容不能超过2000个字符'),
});

export const UpdateCommentStatusInputSchema = z.object({
  status: z.enum(['approved', 'pending', 'spam']),
});

export const CommentPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
