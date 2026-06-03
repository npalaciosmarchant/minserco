import express, { Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'

import { query } from './db'
import { captureBodyMiddleware } from './middleware/audit'
import { verifyAuth } from './middleware/auth'
import usersRouter from './api/users'
import mantencioneRouter from './api/mantenciones'

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware de seguridad y parsing
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Middleware de auditoría
app.use(captureBodyMiddleware)

// Health check
app.get('/health', (res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// API Routes
app.use('/api/auth', usersRouter)
app.use('/api/mantenciones', verifyAuth, mantencioneRouter)

// Rutas de auditoría
app.get('/api/admin/audit-logs', verifyAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 50, userId, entityType, action } = req.query
    const offset = ((Number(page) - 1) * Number(pageSize))

    let sql = 'SELECT * FROM audit_logs WHERE 1=1'
    const params: unknown[] = []
    let paramCount = 1

    if (userId) {
      sql += ` AND user_id = $${paramCount++}`
      params.push(userId)
    }
    if (entityType) {
      sql += ` AND entity_type = $${paramCount++}`
      params.push(entityType)
    }
    if (action) {
      sql += ` AND action = $${paramCount++}`
      params.push(action)
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`
    params.push(pageSize, offset)

    const result = await query(sql, params)

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs WHERE 1=1${userId ? ' AND user_id = $1' : ''}${entityType ? ` AND entity_type = $${userId ? 2 : 1}` : ''}${action ? ` AND action = $${userId || entityType ? '3' : '1'}` : ''}`,
      [userId, entityType, action].filter(Boolean)
    )

    const total = Number(countResult.rows[0].count)

    res.json({
      success: true,
      data: result.rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    })
  } catch (error) {
    console.error('Error obteniendo audit logs:', error)
    res.status(500).json({ success: false, error: 'Error al obtener logs' })
  }
})

// Error handler global
app.use((err: Error, req: express.Request, res: Response, next: NextFunction) => {
  console.error('Error no capturado:', err)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`API servidor corriendo en puerto ${PORT}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
})

export default app
