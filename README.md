# 🏫 PRONEA Sacatepéquez — Sistema de Gestión Educativa v4.0

**Stack:** Next.js 14 · Supabase (PostgreSQL) · Vercel · TypeScript · Tailwind CSS

---

## 📋 Lo que incluye esta versión

| Módulo | Descripción |
|---|---|
| **Sistema de permisos dinámicos** | Admin activa permisos → Director autoriza enlaces → Admin confirma → Enlace ejecuta |
| **Visibilidad coordinador** | Admin controla qué instituciones/enlaces puede ver el coordinador DIGEEX |
| **Documentos configurables** | `documentos_obligatorios` y `documentos_visibles` desde tabla `configuracion` |
| **6 roles completos** | Admin, Coordinador DIGEEX, Director, Técnico, Enlace Institucional, Estudiante |
| **Versión de libro** | Libro viejo/nuevo por estudiante, respetado en tareas, exámenes y clases Tomi |
| **Grupos SIREEX** | Crear grupos, agregar estudiantes, validar, exportar CSV |
| **Ajustes discapacidad** | Tareas ajustadas reflejadas en cálculo de promedios |
| **Login institucional** | Panel informativo dinámico + slider de imágenes + acuerdos vigentes |

---

## 🗄️ PASO 1 — Verificar Supabase

Tu base de datos ya está cargada. Verifica que la migración v4 esté aplicada:

```sql
-- En Supabase → SQL Editor → New query
-- Pega el archivo pronea_v4_permisos.sql y ejecuta
-- Al final debe aparecer ✅ en todos los objetos
```

---

## 💻 PASO 2 — Configurar localmente

```bash
# Clona el repositorio
git clone https://github.com/TU_USUARIO/pronea-sacatepequez.git
cd pronea-sacatepequez

# Instala dependencias
npm install

# Configura variables de entorno
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...clave_publica
SUPABASE_SERVICE_ROLE_KEY=eyJ...clave_PRIVADA
JWT_SECRET=genera_cadena_aleatoria_32_chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**¿Dónde encuentro las claves?**
→ Supabase → tu proyecto → **Settings → API**

**¿Cómo genero JWT_SECRET?**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
# Prueba en desarrollo
npm run dev
# Abre http://localhost:3000
```

---

## 📦 PASO 3 — Subir a GitHub

```bash
# Inicializar repositorio
git init
git add .
git commit -m "feat: PRONEA Sacatepéquez v4.0"

# Crear repo en GitHub (github.com → New repository)
# Nombre: pronea-sacatepequez | Privado recomendado

# Conectar y subir
git remote add origin https://github.com/TU_USUARIO/pronea-sacatepequez.git
git branch -M main
git push -u origin main
```

⚠️ Verifica que `.env.local` NO esté en el repositorio.

---

## 🚀 PASO 4 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **New Project**
2. **Import Git Repository** → selecciona `pronea-sacatepequez`
3. Framework: **Next.js** (auto-detectado)
4. **Environment Variables** — agrega estas 5:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu clave de servicio (PRIVADA) |
| `JWT_SECRET` | Tu cadena secreta |
| `NEXT_PUBLIC_APP_URL` | `https://pronea-sacatepequez.vercel.app` |

5. **Deploy** → espera ~2 minutos
6. Tu app estará en `https://pronea-sacatepequez.vercel.app`

---

## 🔄 PASO 5 — Actualizar (flujo normal)

```bash
# Hacer cambios
git add .
git commit -m "fix: descripción del cambio"
git push
# Vercel redespliegua automáticamente ✅
```

---

## 👤 Crear primer usuario administrador

```sql
-- En Supabase → SQL Editor
-- 1. Genera hash de contraseña en tu terminal:
-- node -e "const b=require('bcryptjs'); b.hash('TuClave2026',10).then(h=>console.log(h))"

-- 2. Insertar administrador:
INSERT INTO usuarios (correo, contrasena_hash, rol, activo, primer_ingreso)
VALUES ('admin@pronea.gob.gt', '$2a$10$...hash_generado...', 'administrador', TRUE, TRUE);

-- 3. Insertar configuración inicial de establecimiento:
INSERT INTO info_establecimiento (id, nombre_completo, nombre_corto, departamento)
VALUES (1, 'PRONEA Sacatepéquez', 'PRONEA', 'Sacatepéquez')
ON CONFLICT (id) DO NOTHING;
```

---

## 🔐 Sistema de permisos — Guía rápida

```sql
-- 1. Admin activa permiso (o desde el frontend Admin → Permisos):
UPDATE permisos_globales SET activo=TRUE, actualizado_por='uuid-admin'
WHERE permiso='ingresar_notas_enlace';

-- 2. Director crea autorización (o desde el frontend Director → Autorizar):
INSERT INTO autorizaciones_director (director_id, enlace_id, permiso)
VALUES ('uuid-director', 'uuid-enlace', 'ingresar_notas_enlace');

-- 3. Admin confirma (o desde el frontend Admin → Autorizaciones):
UPDATE autorizaciones_director SET autorizado_por_admin='uuid-admin', admin_confirmado_en=NOW()
WHERE id='uuid-autorizacion';

-- 4. Verificar desde cualquier query:
SELECT verificar_permiso('uuid-usuario', 'ingresar_notas_enlace');
-- Devuelve TRUE ✅ o FALSE ❌
```

---

## 📁 Estructura del proyecto

```
pronea-sacatepequez/
├── src/
│   ├── app/
│   │   ├── api/                    # 15+ API routes
│   │   │   ├── auth/               # Login, logout
│   │   │   ├── permisos/           # Admin gestiona permisos globales
│   │   │   ├── autorizaciones/     # Director crea, admin confirma
│   │   │   ├── visibilidad/        # Configuración para coordinador
│   │   │   ├── notas/              # Con validación completa de permisos
│   │   │   ├── estudiantes/        # Con visibilidad aplicada para coordinador
│   │   │   ├── sireex/             # Grupos SIREEX + exportar CSV
│   │   │   ├── establecimiento/    # Info institucional editable
│   │   │   └── configuracion/      # Parámetros del sistema
│   │   ├── login/                  # Login con slider e info dinámica
│   │   └── dashboard/
│   │       ├── admin/              # Permisos, Autorizaciones, Visibilidad, Establecimiento
│   │       ├── tecnico/            # Inscribir, Notas (con ajustes), SIREEX
│   │       ├── director/           # Autorizaciones a enlaces
│   │       ├── coordinador/        # Vista con visibilidad aplicada
│   │       ├── enlace/             # Dashboard con estado de permisos
│   │       └── estudiante/         # Libros, notas, ajustes, documentos
│   ├── components/
│   │   ├── ui/index.tsx            # Badge, Modal, Toggle, NotaInput, etc.
│   │   └── layout/Sidebar.tsx      # Navegación por rol
│   ├── lib/
│   │   ├── supabase.ts             # Clientes Supabase
│   │   ├── auth.ts                 # JWT y sesiones
│   │   ├── permisos.ts             # verificarPermiso() + calculos
│   │   └── utils.ts                # Helpers
│   └── types/index.ts              # Todos los tipos del schema v4
├── middleware.ts                   # Protección de rutas por rol
├── .env.example                    # Plantilla de variables
└── .gitignore                      # Excluye .env.local
```

---

## 🆘 Problemas frecuentes

| Error | Solución |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL is not defined` | Verifica variables en Vercel → Settings → Environment Variables |
| `JWT_SECRET is not defined` | Agrega JWT_SECRET en Vercel y en `.env.local` local |
| Error 500 en login | Verifica que la tabla `usuarios` tiene registros con contraseña hasheada con bcrypt |
| Notas no cargan | Verifica que existen libros con la `version` correcta en la tabla `libros` |
| Enlace dice "sin permiso" | Sigue el flujo: Admin activa → Director autoriza → Admin confirma |
| Coordinador ve "No disponible" | Admin configuró visibilidad en Admin → Visibilidad |
| `verificar_permiso` no existe | Ejecuta la migración `pronea_v4_permisos.sql` en Supabase |

---

*PRONEA Sacatepéquez — DIGEEX — MINEDUC Guatemala — v4.0*
