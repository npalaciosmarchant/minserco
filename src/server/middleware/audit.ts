import { Response, NextFunction, Request } from 'express'
import { query } from '../db'
import { AuthRequest } from '../types'

// Guardar el body original antes de que se modifique
export function captureBodyMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.json

  res.json = function(data: unknown) {
    res.locals.responseData = data
    return originalSend.call(this, data)
  }

  if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    res.locals.requestBody = { ...req.body }
  }

  next()
}

export async function logAudit(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  entityNombre?: string,
  changes?: { antes: Record<string, unknown>; despues: Record<string, unknown> },
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await query(
      `INSERT INTO audit_logs
       (user_id, action, entity_type, entity_id, entity_nombre, changes, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, entityType, entityId, entityNombre, JSON.stringify(changes), ipAddress, userAgent]
    )
  } catch (error) {
    console.error('Error logging audit:', error)
  }
}

// Hook para auditar cambios en UPDATE
export function auditUpdateMiddleware(entityType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.method !== 'PATCH' && req.method !== 'PUT') {
      return next()
    }

    const entityId = req.params.id
    const beforeData = res.locals.beforeData // Debería ser seteado por el controlador
    const afterData = req.body

    if (req.user && entityId && beforeData) {
      await logAudit(
        req.user.id,
        'UPDATE',
        entityType,
        entityId,
        undefined,
        { antes: beforeData, despues: afterData },
        req.ip,
        req.get('user-agent')
      )
    }

    next()
  }
}

export async function getAuditLogs(filters: {
  userId?: string
  entityType?: string
  action?: string
  limit?: number
  offset?: number
}) {
  let sql = 'SELECT * FROM audit_logs WHERE 1=1'
  const params: unknown[] = []
  let paramCount = 1

  if (filters.userId) {
    sql += ` AND user_id = $${paramCount++}`
    params.push(filters.userId)
  }
  if (filters.entityType) {
    sql += ` AND entity_type = $${paramCount++}`
    params.push(filters.entityType)
  }
  if (filters.action) {
    sql += ` AND action = $${paramCount++}`
    params.push(filters.action)
  }

  sql += ` ORDER BY created_at DESC`

  if (filters.limit) {
    sql += ` LIMIT $${paramCount++}`
    params.push(filters.limit)
  }
  if (filters.offset) {
    sql += ` OFFSET $${paramCount++}`
    params.push(filters.offset)
  }

  const result = await query(sql, params)
  return result.rows
}
