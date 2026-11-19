import { z } from 'zod';

export interface TagDto {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: number;
  entryCount?: number;
}

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1, '标签名称不能为空').max(50),
  slug: z.string().trim().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, '颜色值必须为合法 Hex 格式')
    .optional()
    .nullable(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
