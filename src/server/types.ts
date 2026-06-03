import { Request } from 'express'

export interface UserPayload {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'tecnico'
}

export interface AuthRequest extends Request {
  user?: UserPayload
}

export interface AuditLog {
  id: string
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity_type: string
  entity_id: string
  entity_nombre?: string
  changes?: {
    antes: Record<string, unknown>
    despues: Record<string, unknown>
  }
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
