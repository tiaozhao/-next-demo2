import { z } from 'zod';

// Request schema
export const storeFeatureRequestSchema = z.object({
  storeName: z.string().min(1, 'Store name is required')
}).strict();

// Response schema for feature item
export const featureItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  children: z.array(
    z.object({
      key: z.string(),
      label: z.string()
    })
  ).optional()
});

// Response schema
export const storeFeatureResponseSchema = z.object({
  storeName: z.string(),
  features: z.array(featureItemSchema),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// Type exports
export type StoreFeatureRequest = z.infer<typeof storeFeatureRequestSchema>;
export type FeatureItem = z.infer<typeof featureItemSchema>;
export type StoreFeatureResponse = z.infer<typeof storeFeatureResponseSchema>; 