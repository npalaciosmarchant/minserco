# Próximos Pasos - Integración Frontend + Backend

---

## Estado actual

Completado:
- Backend Express con PostgreSQL
- Autenticación JWT
- Sistema de auditoría
- API CRUD para mantenciones
- 2 usuarios de prueba (admin + técnico)
- Datos de ejemplo

Falta:
- Conectar frontend Next.js al API
- Notificaciones (Slack, Email, Push)
- Reportes automáticos
- Página de auditoría
- Más endpoints CRUD

---

## Fase siguiente: Conectar Frontend

### Tarea 1: Crear cliente HTTP en frontend

Archivo: `src/lib/api.ts`

```typescript
// Función centralizada para todas las llamadas API
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
```

### Tarea 2: Reemplazar llamadas a localStorage

Archivo: `src/app/login/page.tsx`

```typescript
// ANTES (localStorage)
const user = JSON.parse(localStorage.getItem('user'))

// DESPUÉS (API)
const { data } = await apiCall('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
})
localStorage.setItem('auth_token', data.token)
```

### Tarea 3: Actualizar todas las páginas CRUD

Cambiar en cada página:
- `mantenciones.getAll()` → `await apiCall('/api/mantenciones')`
- `mantenciones.add(data)` → `await apiCall('/api/mantenciones', { method: 'POST', body: JSON.stringify(data) })`
- Etc.

---

## Variables de entorno para frontend

Agregar a `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Testing manual del flujo

1. Login en frontend → Obtiene JWT token
2. Listar mantenciones → Lee del API
3. Crear mantención → Inserta en BD
4. Verificar en auditoría → Los cambios aparecen

---

## Arquitectura post-integración

```
Cliente (Next.js)
    ↓
[localStorage: token]
    ↓
API (Express)
    ↓
PostgreSQL
    ↓
audit_logs (registra todo)
    ↓
Notificaciones (próximo: Slack, Email)
```

---

## Pasos detallados para integración

### Paso A: Variable de entorno

1. Crear `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

2. Reiniciar Next.js: `npm run dev`

### Paso B: Cliente HTTP

1. Crear `src/lib/api.ts` con función `apiCall()`
2. Testear manual en browser console:
   ```javascript
   const token = 'tu_token_aqui'
   fetch('http://localhost:3001/api/mantenciones', {
     headers: { 'Authorization': `Bearer ${token}` }
   }).then(r => r.json()).then(console.log)
   ```

### Paso C: Página de Login

1. Modificar `src/app/login/page.tsx`
2. Cambiar de localStorage a API call
3. Guardar token en localStorage
4. Testear login

### Paso D: Página de Mantenciones

1. Modificar `src/app/mantencion/page.tsx`
2. Cambiar `getAll()` a `apiCall()`
3. Agregar loading state mientras espera
4. Testear CRUD completo

### Paso E: Repetir para todas las páginas

Páginas a actualizar:
- /login
- /mantencion
- /reparacion
- /bodega
- /clientes
- /proveedores
- /cotizaciones
- /ordenes
- /arriendos
- /importacion
- /gastos
- /fabricacion

---

## Checklist

- [ ] Variable de entorno NEXT_PUBLIC_API_URL configurada
- [ ] Cliente HTTP (src/lib/api.ts) creado
- [ ] Login funciona y retorna token
- [ ] Token se guarda en localStorage
- [ ] Token se envía en headers de API
- [ ] Listado de mantenciones funciona (desde API)
- [ ] Crear mantención funciona (inserta en BD)
- [ ] Actualizar mantención funciona
- [ ] Eliminar mantención funciona
- [ ] Auditoría registra los cambios
- [ ] Todas las páginas CRUD conectadas

---

## Duda: ¿Por dónde empezar?

Recomendación:
1. Primero conecta el login
2. Luego una página CRUD simple (mantencion)
3. Verifica que la auditoría funciona
4. Luego el resto de páginas

Así garantizas que todo fluye bien antes de actualizar todo.

