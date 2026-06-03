import { Router, Response } from 'express'
import { query } from '../db'
import { AuthRequest, ApiResponse, PaginatedResponse } from '../types'
import { verifyAuth } from '../middleware/auth'
import { logAudit } from '../middleware/audit'

const router = Router()

// Crear mantención
router.post('/', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      equipo,
      numeroSerie,
      tipo,
      descripcion,
      tecnico,
      fecha,
      estado,
      observaciones,
      proximaMantencion,
    } = req.body

    if (!equipo || !descripcion || !tecnico) {
      return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' })
    }

    const result = await query(
      `INSERT INTO mantenciones
       (equipo, numero_serie, tipo, descripcion, tecnico, fecha, estado, observaciones, proxima_mantencion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [equipo, numeroSerie, tipo || 'preventivo', descripcion, tecnico, fecha, estado || 'pendiente', observaciones, proximaMantencion]
    )

    const mantencion = result.rows[0]

    // Auditoría
    await logAudit(
      req.user!.id,
      'CREATE',
      'mantencion',
      mantencion.id,
      equipo,
      { antes: {}, despues: req.body },
      req.ip,
      req.get('user-agent')
    )

    res.status(201).json({
      success: true,
      data: mantencion,
    } as ApiResponse)
  } catch (error) {
    console.error('Error creando mantención:', error)
    res.status(500).json({ success: false, error: 'Error al crear mantención' })
  }
})

// Obtener mantenciones (con paginación)
router.get('/', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 20, estado, tecnico } = req.query
    const offset = ((Number(page) - 1) * Number(pageSize))

    let sql = 'SELECT * FROM mantenciones WHERE 1=1'
    const params: unknown[] = []
    let paramCount = 1

    if (estado) {
      sql += ` AND estado = $${paramCount++}`
      params.push(estado)
    }
    if (tecnico) {
      sql += ` AND tecnico ILIKE $${paramCount++}`
      params.push(`%${tecnico}%`)
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`
    params.push(pageSize, offset)

    const result = await query(sql, params)

    const countSql = 'SELECT COUNT(*) FROM mantenciones WHERE 1=1' +
      (estado ? ` AND estado = $1` : '') +
      (tecnico ? ` AND tecnico ILIKE $${estado ? 2 : 1}` : '')

    const countResult = await query(countSql, params.filter((_, i) => i < (estado ? 1 : 0) + (tecnico ? 1 : 0)))
    const total = Number(countResult.rows[0].count)

    res.json({
      success: true,
      data: result.rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    } as PaginatedResponse)
  } catch (error) {
    console.error('Error obteniendo mantenciones:', error)
    res.status(500).json({ success: false, error: 'Error al obtener mantenciones' })
  }
})

// Obtener una mantención
router.get('/:id', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM mantenciones WHERE id = $1', [req.params.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mantención no encontrada' })
    }

    res.json({ success: true, data: result.rows[0] } as ApiResponse)
  } catch (error) {
    console.error('Error obteniendo mantención:', error)
    res.status(500).json({ success: false, error: 'Error al obtener mantención' })
  }
})

// Actualizar mantención
router.patch('/:id', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { equipo, numeroSerie, tipo, descripcion, tecnico, fecha, estado, observaciones, proximaMantencion } = req.body

    // Obtener datos anteriores
    const beforeResult = await query('SELECT * FROM mantenciones WHERE id = $1', [id])
    if (beforeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mantención no encontrada' })
    }

    const beforeData = beforeResult.rows[0]

    const updates: string[] = []
    const values: unknown[] = []
    let paramCount = 1

    if (equipo !== undefined) { updates.push(`equipo = $${paramCount++}`); values.push(equipo) }
    if (numeroSerie !== undefined) { updates.push(`numero_serie = $${paramCount++}`); values.push(numeroSerie) }
    if (tipo !== undefined) { updates.push(`tipo = $${paramCount++}`); values.push(tipo) }
    if (descripcion !== undefined) { updates.push(`descripcion = $${paramCount++}`); values.push(descripcion) }
    if (tecnico !== undefined) { updates.push(`tecnico = $${paramCount++}`); values.push(tecnico) }
    if (fecha !== undefined) { updates.push(`fecha = $${paramCount++}`); values.push(fecha) }
    if (estado !== undefined) { updates.push(`estado = $${paramCount++}`); values.push(estado) }
    if (observaciones !== undefined) { updates.push(`observaciones = $${paramCount++}`); values.push(observaciones) }
    if (proximaMantencion !== undefined) { updates.push(`proxima_mantencion = $${paramCount++}`); values.push(proximaMantencion) }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Sin cambios' })
    }

    values.push(id)
    const sql = `UPDATE mantenciones SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`

    const result = await query(sql, values)
    const updatedMantencion = result.rows[0]

    // Auditoría
    await logAudit(
      req.user!.id,
      'UPDATE',
      'mantencion',
      id,
      equipo || beforeData.equipo,
      { antes: beforeData, despues: req.body },
      req.ip,
      req.get('user-agent')
    )

    res.json({ success: true, data: updatedMantencion } as ApiResponse)
  } catch (error) {
    console.error('Error actualizando mantención:', error)
    res.status(500).json({ success: false, error: 'Error al actualizar mantención' })
  }
})

// Eliminar mantención
router.delete('/:id', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const beforeResult = await query('SELECT * FROM mantenciones WHERE id = $1', [id])
    if (beforeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mantención no encontrada' })
    }

    const beforeData = beforeResult.rows[0]

    await query('DELETE FROM mantenciones WHERE id = $1', [id])

    // Auditoría
    await logAudit(
      req.user!.id,
      'DELETE',
      'mantencion',
      id,
      beforeData.equipo,
      { antes: beforeData, despues: {} },
      req.ip,
      req.get('user-agent')
    )

    res.json({ success: true, message: 'Mantención eliminada' } as ApiResponse)
  } catch (error) {
    console.error('Error eliminando mantención:', error)
    res.status(500).json({ success: false, error: 'Error al eliminar mantención' })
  }
})

export default router
