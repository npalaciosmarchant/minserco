import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db'
import { AuthRequest, ApiResponse } from '../types'
import { verifyAuth, verifyAdmin, generateToken } from '../middleware/auth'
import { logAudit } from '../middleware/audit'

const router = Router()

// Registro de usuario (solo admin)
router.post('/register', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, password, rol } = req.body

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' })
    }

    if (!['admin', 'tecnico'].includes(rol)) {
      return res.status(400).json({ success: false, error: 'Rol inválido' })
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email ya registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await query(
      `INSERT INTO users (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, passwordHash, rol]
    )

    const user = result.rows[0]

    // Auditoría
    await logAudit(
      req.user!.id,
      'CREATE',
      'usuario',
      user.id,
      user.nombre,
      { antes: {}, despues: { nombre, email, rol } },
      req.ip,
      req.get('user-agent')
    )

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user,
    } as ApiResponse)
  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({ success: false, error: 'Error al crear usuario' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' })
    }

    const result = await query('SELECT id, nombre, email, rol, password_hash FROM users WHERE email = $1 AND activo = true', [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' })
    }

    const user = result.rows[0]
    const passwordValid = await bcrypt.compare(password, user.password_hash)

    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' })
    }

    const token = generateToken({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    })

    // Log de acceso
    await logAudit(
      user.id,
      'CREATE',
      'sesion',
      user.id,
      user.nombre,
      undefined,
      req.ip,
      req.get('user-agent')
    )

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
        },
      },
    } as ApiResponse)
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' })
  }
})

// Obtener perfil
router.get('/me', verifyAuth, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  } as ApiResponse)
})

// Listar usuarios (solo admin)
router.get('/list', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 20 } = req.query
    const offset = ((Number(page) - 1) * Number(pageSize))

    const result = await query(
      `SELECT id, nombre, email, rol, activo, telefono, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    )

    const countResult = await query('SELECT COUNT(*) FROM users')
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
    console.error('Error listando usuarios:', error)
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' })
  }
})

// Actualizar usuario
router.patch('/:id', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { nombre, telefono } = req.body

    if (req.user!.rol !== 'admin' && req.user!.id !== id) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' })
    }

    // Obtener datos anteriores
    const beforeResult = await query('SELECT * FROM users WHERE id = $1', [id])
    if (beforeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' })
    }

    const beforeData = beforeResult.rows[0]

    const updates: string[] = []
    const values: unknown[] = []
    let paramCount = 1

    if (nombre) {
      updates.push(`nombre = $${paramCount++}`)
      values.push(nombre)
    }
    if (telefono !== undefined) {
      updates.push(`telefono = $${paramCount++}`)
      values.push(telefono)
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Sin cambios' })
    }

    values.push(id)
    const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, nombre, email, rol`

    const result = await query(sql, values)
    const updatedUser = result.rows[0]

    // Auditoría
    await logAudit(
      req.user!.id,
      'UPDATE',
      'usuario',
      id,
      updatedUser.nombre,
      { antes: beforeData, despues: { nombre, telefono } },
      req.ip,
      req.get('user-agent')
    )

    res.json({ success: true, data: updatedUser } as ApiResponse)
  } catch (error) {
    console.error('Error actualizando usuario:', error)
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' })
  }
})

export default router
