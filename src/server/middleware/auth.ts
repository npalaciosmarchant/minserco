import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthRequest, UserPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_secret'

export function verifyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token no proporcionado' })
    }

    const payload = jwt.verify(token, JWT_SECRET) as UserPayload
    req.user = payload
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' })
  }
}

export function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  verifyAuth(req, res, () => {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol admin.' })
    }
    next()
  })
}

export function generateToken(user: UserPayload): string {
  const expiresIn = process.env.JWT_EXPIRY || '7d'
  return jwt.sign(user, JWT_SECRET, { expiresIn })
}
