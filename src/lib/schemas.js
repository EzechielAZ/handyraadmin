import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id_user: z.string().uuid(),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(8, 'Invalid phone number'),
  user_role: z.enum(['CLIENT', 'ARTISAN']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).default('ACTIVE'),
  is_verified: z.boolean().default(false),
  created_at: z.string().datetime(),
})

// Artisan schemas
export const artisanSchema = z.object({
  id_artisan: z.string().uuid(),
  ifu_number: z.string().min(1, 'IFU number is required'),
  experience_years: z.number().min(0, 'Experience years must be positive'),
  average_rating: z.number().min(0).max(5).optional(),
  total_missions: z.number().min(0).default(0),
  availability_status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('OFFLINE'),
  kyc_status: z.enum(['PENDING', 'VALIDATED', 'REJECTED']).default('PENDING'),
  is_pro_member: z.boolean().default(false),
})

// Mission schemas
export const missionSchema = z.object({
  id_mission: z.string().uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'ON_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  mission_type: z.enum(['IMMEDIATE', 'SCHEDULED']),
  mission_world: z.enum(['SERVICE', 'CONSTRUCTION']).default('SERVICE'),
  description: z.string().min(1, 'Description is required'),
  estimated_price: z.number().min(0).optional(),
  final_price: z.number().min(0).optional(),
  handyra_fee: z.number().min(0),
  scheduled_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
})

// Payment schemas
export const paymentSchema = z.object({
  id_payment: z.string().uuid(),
  transaction_ref: z.string().min(1),
  amount: z.number().min(0),
  handyra_fee: z.number().min(0),
  artisan_net: z.number().min(0),
  payment_method: z.enum(['WALLET', 'MOMO', 'CARD', 'CASH']),
  status: z.enum(['SUCCESS', 'FAILED', 'REFUNDED']),
  escrow_status: z.enum(['HELD', 'RELEASED', 'REFUNDED']).optional(),
  processed_at: z.string().datetime(),
})

// Filter schemas
export const dateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
})

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Export types
export type User = z.infer<typeof userSchema>
export type Artisan = z.infer<typeof artisanSchema>
export type Mission = z.infer<typeof missionSchema>
export type Payment = z.infer<typeof paymentSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type Pagination = z.infer<typeof paginationSchema>