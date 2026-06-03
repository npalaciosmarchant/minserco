# Nuevas Features - Minserco 2026

## 1. Sistema de Permisos por Técnico

Admin puede seleccionar qué módulos ve/crea/edita cada técnico.

**Tablas BD:**
- `modulos_app` - Lista de módulos disponibles
- `tecnico_permisos` - Permisos específicos por técnico

**Uso:**
```typescript
import { obtenerPermisosTecnico, puedoVer } from "@/lib/permissions"

const permisos = await obtenerPermisosTecnico(tecnicoId)
if (puedoVer("reparaciones", permisos)) {
  // Mostrar módulo
}
```

**En admin/usuarios:**
Importar `<PermisosForm tecnicoId={id} />` al crear/editar técnico.

---

## 2. Dashboard con Métricas

Gráficos de reparaciones, costos, productividad.

**Funciones:**
```typescript
import { obtenerMetricas } from "@/lib/dashboard"

const metricas = await obtenerMetricas()
// Devuelve: totalReparaciones, reparacionesVencidas, gastosTotal, etc.
```

**Datos disponibles:**
- Total y estado de reparaciones
- Gastos (total, este mes)
- Equipos en servicio
- Productividad por técnico
- Ingresos vs gastos (últimos 6 meses)

---

## 3. Reportes PDF con Imágenes Comprimidas

Mejora de PDFs con fotos comprimidas.

**Uso:**
```typescript
import { generarPDFConImagenes } from "@/lib/generate-pdf-with-images"

const pdf = await generarPDFConImagenes({
  titulo: "Informe de Reparación",
  datos: { Equipo: "Supresor", Cliente: "Acme" },
  tablas: [{ titulo: "Repuestos", columnas: [...], filas: [...] }],
  imagenes: [{ url, x: 20, y: 100, width: 100, height: 80 }],
  fecha: true,
})
```

---

## 4. Búsqueda Global Mejorada

Búsqueda rápida en reparaciones, clientes, técnicos, órdenes.

**Uso:**
```typescript
import { buscarGlobal } from "@/lib/search"

const resultados = await buscarGlobal("supresor")
// Devuelve: tipo, id, titulo, descripcion, url
```

**Agregar a componente:**
```typescript
<input onChange={e => buscarGlobal(e.target.value)} placeholder="Buscar..." />
```

---

## 5. Alertas de Reparaciones Vencidas

Notificaciones automáticas para:
- Reparaciones vencidas
- Próximas mantenciones
- Contratos por vencer

**Uso:**
```typescript
import { obtenerAlertasVencidas, enviarNotificacionTecnico } from "@/lib/alertas"

const alertas = await obtenerAlertasVencidas()
alertas.forEach(alerta => {
  console.log(alerta.titulo) // "Reparación vencida: Supresor"
})
```

---

## 6. Historial y Auditoría

Tabla `audit_log` registra todas las operaciones.

**Estructura:**
```sql
- tabla: nombre de tabla modificada
- operacion: INSERT, UPDATE, DELETE
- registro_id: ID del registro modificado
- datos_antes, datos_despues: cambios
- usuario_id: quién hizo el cambio
- creado_en: cuándo
```

**Leer auditoría:**
```typescript
const { data: auditoria } = await supabase
  .from("audit_log")
  .select("*")
  .eq("tabla", "reparaciones")
  .order("creado_en", { ascending: false })
```

---

## 7. Modo Offline

Service Worker (`public/sw.js`) permite:
- Usar app sin internet
- Sincronizar datos cuando hay conexión
- Cache automático de assets

**Activar en layout.tsx:**
```typescript
useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
  }
}, [])
```

**Para datos locales (sincronización futura):**
```typescript
// Guardar en IndexedDB antes de enviar
const db = await openDB("minserco")
await db.add("pendientes", { tipo: "reparacion", data: {...} })
```

---

## 8. Compresión de Imágenes

Ya integrado. Las fotos se reducen 70-90% automáticamente.

```typescript
import { compressImage } from "@/lib/imageCompression"

const compressed = await compressImage(file)
await supabase.storage.from("fotos").upload(nombre, compressed)
```

---

## Prioridades de Implementación

**Fase 1 (Inmediata):**
1. Agregar PermisosForm en admin de técnicos
2. Usar permisos para mostrar/ocultar módulos en NavDrawer
3. Implementar dashboard básico en home

**Fase 2 (Esta semana):**
4. Mejorar PDFs con imágenes en informes
5. Agregar búsqueda global en Topbar
6. Registrar auditoría automática en mutaciones

**Fase 3 (Siguiente semana):**
7. Alertas push para técnicos
8. Activar Service Worker
9. Sincronización offline de datos

---

## Archivos Creados

- `src/lib/permissions.ts` - Sistema de permisos
- `src/lib/dashboard.ts` - Métricas
- `src/lib/generate-pdf-with-images.ts` - PDFs mejorados
- `src/lib/search.ts` - Búsqueda global
- `src/lib/alertas.ts` - Alertas
- `src/components/PermisosForm.tsx` - Selector de permisos (admin)
- `public/sw.js` - Service Worker
- Compresión de imágenes (ya hecha)

---

## RLS Security

Falta habilitar RLS en tablas:
- `usuarios`
- `gastos`

Hacerlo desde Supabase Dashboard → RLS → Enable + crear policies.
