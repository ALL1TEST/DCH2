// ============================================================
// ZOD VALIDATORS — Enterprise CMS Admin Dashboard
// ============================================================

import { z } from 'zod/v4';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/shared/constants';

// -------------------- Common Patterns --------------------

export const emailSchema = z.email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(200, 'Name must be 200 characters or less')
  .trim();

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must be 255 characters or less')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be a valid URL slug (lowercase, hyphens only)')
  .trim();

export const urlSchema = z.url('Please enter a valid URL');

export const nonEmptyStringSchema = z.string().min(1, 'This field is required').trim();

export const optionalStringSchema = z.string().trim().optional().or(z.literal(''));

export const positiveIntSchema = z
  .int('Must be a whole number')
  .positive('Must be greater than 0');

export const booleanSchema = z.boolean();

export const jsonArraySchema = z.string().transform((val, ctx) => {
  try {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) {
      ctx.issues.push({
        code: 'custom',
        message: 'Must be a valid JSON array',
        input: val,
      });
      return z.NEVER;
    }
    return parsed;
  } catch {
    ctx.issues.push({
      code: 'custom',
      message: 'Must be valid JSON',
      input: val,
    });
    return z.NEVER;
  }
});

export const jsonObjectSchema = z.string().transform((val, ctx) => {
  try {
    return JSON.parse(val);
  } catch {
    ctx.issues.push({
      code: 'custom',
      message: 'Must be valid JSON',
      input: val,
    });
    return z.NEVER;
  }
});

// -------------------- Pagination --------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_PAGE_SIZE),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// -------------------- Login --------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// -------------------- Signup (public Create Account) --------------------
// Mirrors the password requirements already enforced for users created
// inside the product (passwordSchema: 8+ chars, upper, lower, digit) and
// requires explicit Terms/Privacy acceptance. Reuses the same email/name
// patterns as every other form in the app.

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, 'You must accept the Terms of Service and Privacy Policy'),
});

export type SignupInput = z.infer<typeof signupSchema>;

// -------------------- User --------------------

export const userCreateSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'EDITOR']).default('EDITOR'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: z.enum(['ADMIN', 'EDITOR']).optional(),
  status: z.enum(['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  bio: z.string().max(2000).optional(),
  avatar: optionalStringSchema,
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// -------------------- Content (ContentItem) --------------------

export const contentCreateSchema = z.object({
  title: nonEmptyStringSchema.max(500),
  slug: slugSchema,
  contentTypeId: z.string().min(1, 'Content type is required'),
  categoryId: z.string().optional().or(z.literal('')),
  featuredImageId: z.string().optional().or(z.literal('')),
  content: optionalStringSchema,
  excerpt: z.string().max(1000).optional().or(z.literal('')),
  status: z
    .enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
    .default('DRAFT'),
  seoTitle: z.string().max(70).optional().or(z.literal('')),
  seoDescription: z.string().max(160).optional().or(z.literal('')),
  focusKeyword: optionalStringSchema,
  scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;

export const contentUpdateSchema = z.object({
  title: nonEmptyStringSchema.max(500).optional(),
  slug: slugSchema.optional(),
  categoryId: z.string().optional().or(z.literal('')),
  featuredImageId: z.string().optional().or(z.literal('')),
  content: optionalStringSchema,
  excerpt: z.string().max(1000).optional().or(z.literal('')),
  status: z
    .enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'])
    .optional(),
  seoTitle: z.string().max(70).optional().or(z.literal('')),
  seoDescription: z.string().max(160).optional().or(z.literal('')),
  focusKeyword: optionalStringSchema,
  scheduledAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
});

export type ContentUpdateInput = z.infer<typeof contentUpdateSchema>;

// -------------------- Category --------------------

export const categoryCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  slug: slugSchema,
  description: z.string().max(1000).optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z.object({
  name: nonEmptyStringSchema.max(200).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

// -------------------- Tag --------------------

export const tagCreateSchema = z.object({
  name: nonEmptyStringSchema.max(100),
  slug: slugSchema,
  color: optionalStringSchema,
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z.object({
  name: nonEmptyStringSchema.max(100).optional(),
  slug: slugSchema.optional(),
  color: optionalStringSchema,
});

export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;

// -------------------- Media --------------------

export const mediaUpdateSchema = z.object({
  alt: optionalStringSchema,
  caption: z.string().max(500).optional().or(z.literal('')),
  folderId: z.string().optional().or(z.literal('')),
});

export type MediaUpdateInput = z.infer<typeof mediaUpdateSchema>;

// -------------------- Comment --------------------

export const commentUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'SPAM']).optional(),
});

export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;

// -------------------- Form --------------------

export const formCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  fields: jsonArraySchema,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export type FormCreateInput = z.infer<typeof formCreateSchema>;

// -------------------- Newsletter --------------------

export const subscriberCreateSchema = z.object({
  email: emailSchema,
  name: optionalStringSchema,
});

export type SubscriberCreateInput = z.infer<typeof subscriberCreateSchema>;

// -------------------- Settings --------------------

export const settingUpdateSchema = z.object({
  value: z.string().min(1),
});

export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;

// -------------------- Webhook --------------------

export const webhookCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  url: urlSchema,
  events: jsonArraySchema,
  secret: optionalStringSchema,
});

export type WebhookCreateInput = z.infer<typeof webhookCreateSchema>;

// -------------------- Redirect --------------------

export const redirectCreateSchema = z.object({
  fromPath: z.string().min(1, 'From path is required').startsWith('/'),
  toPath: z.string().min(1, 'To path is required'),
  type: z.enum(['PERMANENT', 'TEMPORARY', 'REGEX']).default('PERMANENT'),
});

export type RedirectCreateInput = z.infer<typeof redirectCreateSchema>;

// -------------------- Navigation --------------------

export const navigationCreateSchema = z.object({
  name: nonEmptyStringSchema.max(200),
  slug: slugSchema,
  description: optionalStringSchema,
  items: jsonArraySchema,
});

export type NavigationCreateInput = z.infer<typeof navigationCreateSchema>;

// -------------------- Change Password --------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// -------------------- Profile Update --------------------

export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  bio: z.string().max(2000).optional().or(z.literal('')),
  avatar: optionalStringSchema,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// -------------------- Bulk Operation --------------------

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one item'),
  action: z.enum([
    'DELETE',
    'PUBLISH',
    'UNPUBLISH',
    'ARCHIVE',
    'RESTORE',
    'MOVE',
    'ASSIGN',
    'EXPORT',
    'IMPORT',
    'ADD_TAGS',
    'REMOVE_TAGS',
  ]),
  payload: jsonObjectSchema.optional(),
});

export type BulkActionInput = z.infer<typeof bulkActionSchema>;
