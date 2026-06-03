import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { query } from './index'

async function seed() {
  try {
    console.log('Iniciando seed de datos...')

    // Crear usuario admin
    const adminPassword = await bcrypt.hash('Minserco2024!Temporal', 10)
    const adminResult = await query(
      `INSERT INTO users (nombre, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3
       RETURNING id, nombre, email, rol`,
      ['Sergio Albornoz', 'sergioalbornoz@minserco.cl', adminPassword, 'admin', '+56 9 XXXX XXXX']
    )

    const admin = adminResult.rows[0]
    console.log(`Usuario admin creado/actualizado: ${admin.email}`)

    // Crear usuario técnico de prueba
    const techPassword = await bcrypt.hash('Tecnico2024!Temporal', 10)
    const techResult = await query(
      `INSERT INTO users (nombre, email, password_hash, rol, telefono)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3
       RETURNING id, nombre, email, rol`,
      ['Técnico Demo', 'tecnico@minserco.cl', techPassword, 'tecnico', '+56 9 YYYY YYYY']
    )

    const tech = techResult.rows[0]
    console.log(`Usuario técnico creado/actualizado: ${tech.email}`)

    // Crear algunos equipos de ejemplo
    const equipos = [
      {
        numero_serie: 'EQ-001-2024',
        nombre: 'Equipo Excavadora CAT 320',
        tipo: 'Maquinaria Pesada',
        marca: 'Caterpillar',
        modelo: '320',
        ubicacion: 'Bodega Central',
        estado: 'operativo',
      },
      {
        numero_serie: 'EQ-002-2024',
        nombre: 'Compactadora Vibradora',
        tipo: 'Maquinaria de Construcción',
        marca: 'Hamm',
        modelo: 'HD90',
        ubicacion: 'Obra Sector Norte',
        estado: 'operativo',
      },
      {
        numero_serie: 'EQ-003-2024',
        nombre: 'Generador Eléctrico 100KW',
        tipo: 'Generador',
        marca: 'Perkins',
        modelo: 'GP100',
        ubicacion: 'Almacén 2',
        estado: 'mantenimiento',
      },
    ]

    for (const equipo of equipos) {
      await query(
        `INSERT INTO equipos (numero_serie, nombre, tipo, marca, modelo, ubicacion, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (numero_serie) DO NOTHING`,
        [equipo.numero_serie, equipo.nombre, equipo.tipo, equipo.marca, equipo.modelo, equipo.ubicacion, equipo.estado]
      )
    }

    console.log(`${equipos.length} equipos de ejemplo creados`)

    // Crear algunas mantenciones de ejemplo
    const mantenciones = [
      {
        equipo: 'Equipo Excavadora CAT 320',
        numero_serie: 'EQ-001-2024',
        tipo: 'preventivo',
        descripcion: 'Revisión general de motor y cambio de filtros',
        tecnico: 'Técnico Demo',
        fecha: new Date().toISOString().split('T')[0],
        estado: 'pendiente',
        observaciones: 'Mantención programada según plan anual',
      },
      {
        equipo: 'Compactadora Vibradora',
        numero_serie: 'EQ-002-2024',
        tipo: 'correctivo',
        descripcion: 'Reparación de sistema hidráulico',
        tecnico: 'Técnico Demo',
        fecha: new Date().toISOString().split('T')[0],
        estado: 'en_proceso',
        observaciones: 'Identificado problema en cilindro principal',
      },
    ]

    for (const mantencion of mantenciones) {
      await query(
        `INSERT INTO mantenciones (equipo, numero_serie, tipo, descripcion, tecnico, fecha, estado, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          mantencion.equipo,
          mantencion.numero_serie,
          mantencion.tipo,
          mantencion.descripcion,
          mantencion.tecnico,
          mantencion.fecha,
          mantencion.estado,
          mantencion.observaciones,
        ]
      )
    }

    console.log(`${mantenciones.length} mantenciones de ejemplo creadas`)

    // Crear items de bodega
    const bodegaItems = [
      {
        nombre: 'Repuesto Filtro Motor CAT',
        codigo: 'FILT-CAT-001',
        cantidad: 3,
        cantidad_minima: 5,
        unidad: 'unidad',
        precio_unitario: 45000,
        ubicacion_estante: 'A-12',
        descripcion: 'Filtro motor para excavadora CAT serie 300',
      },
      {
        nombre: 'Aceite Sintético 10W40',
        codigo: 'OLE-SIN-001',
        cantidad: 2,
        cantidad_minima: 10,
        unidad: 'litro',
        precio_unitario: 12000,
        ubicacion_estante: 'B-05',
        descripcion: 'Aceite sintético para maquinaria pesada',
      },
      {
        nombre: 'Correa Transmisión',
        codigo: 'COR-TRA-001',
        cantidad: 0,
        cantidad_minima: 3,
        unidad: 'unidad',
        precio_unitario: 28000,
        ubicacion_estante: 'C-08',
        descripcion: 'Correa de transmisión para compactadora',
      },
    ]

    for (const item of bodegaItems) {
      await query(
        `INSERT INTO bodega (nombre, codigo, cantidad, cantidad_minima, unidad, precio_unitario, ubicacion_estante, descripcion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (codigo) DO NOTHING`,
        [
          item.nombre,
          item.codigo,
          item.cantidad,
          item.cantidad_minima,
          item.unidad,
          item.precio_unitario,
          item.ubicacion_estante,
          item.descripcion,
        ]
      )
    }

    console.log(`${bodegaItems.length} items de bodega creados`)

    console.log('Seed completado exitosamente')
    process.exit(0)
  } catch (error) {
    console.error('Error en seed:', error)
    process.exit(1)
  }
}

seed()
