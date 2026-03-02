# Pagos - Gestión de Deudas entre Amigos

Una aplicación web completa para gestionar deudas y pagos entre amigos.

## Stack Tecnológico

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL (Supabase) + Prisma ORM
- **Autenticación**: NextAuth.js con credenciales
- **Almacenamiento**: Supabase Storage para imágenes
- **Notificaciones**: Sonner para toast notifications

## Características

### Autenticación
- Login con usuario y contraseña
- Roles: Admin y User
- Middleware que protege rutas bajo `/dashboard`
- Usuarios pre-configurados en `config/users.json`

### Funcionalidades

#### Para Todos los Usuarios
- **Dashboard**: Resumen de balance personal
  - Total de deudas
  - Total de créditos
  - Balance neto
  - Detalles por usuario
- **Deudas**: Visualizar todas las deudas (las propias si es usuario)
- **Pagos**: Registrar nuevos pagos con comprobante
- **Historial**: Ver todos los pagos realizados

#### Para Administradores
- Registrar nuevas deudas entre usuarios
- Ver balance de todos los usuarios
- Panel global con matriz de balances
- Estadísticas de transacciones

## Instalación

### Requisitos Previos
- Node.js 18+
- PostgreSQL (mediante Supabase)
- Cuenta de Supabase

### Pasos de Instalación

1. Clonar el repositorio
```bash
git clone <repo-url>
cd pagos
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Base de Datos PostgreSQL
DATABASE_URL="postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]"

# NextAuth
NEXTAUTH_SECRET="tu-secreto-aleatorio-min-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-llave-anonima"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

### Configuración de Supabase

1. Crear una cuenta en [supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. En la sección Storage, crear dos buckets:
   - `receipts` - para imágenes de comprobantes
   - `avatars` (opcional) - para avatares de usuarios
4. Activar autenticación RLS si lo deseas
5. Copiar las credenciales a `.env.local`

### Configuración de Base de Datos

1. Ejecutar migraciones de Prisma:
```bash
npx prisma db push
```

2. Poblar datos iniciales:
```bash
npm run seed
```

Esto creará los usuarios de prueba definidos en `config/users.json`:
- **admin** / **admin123** (rol: admin)
- **usuario1** / **admin123** (rol: user)
- **usuario2** / **admin123** (rol: user)

### usuarios.json

El archivo `config/users.json` contiene los usuarios iniciales con contraseñas hasheadas con bcrypt:
```json
[
  {
    "id": "1",
    "username": "admin",
    "password": "$2b$10$...",  // bcrypt hash
    "role": "admin"
  },
  ...
]
```

## Desarrollo

### Iniciar el servidor de desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Scripts Disponibles
- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia servidor de producción
- `npm run lint` - Ejecuta ESLint
- `npm run db:push` - Aplica cambios en la base de datos
- `npm run db:studio` - Abre Prisma Studio
- `npm run seed` - Carga datos iniciales

## Estructura del Proyecto

```
app/
  ├── api/                    # API routes
  │   ├── auth/[...nextauth]  # Rutas de autenticación
  │   ├── debts/              # CRUD de deudas
  │   ├── payments/           # CRUD de pagos
  │   ├── users/              # Lista de usuarios
  │   └── upload/             # Upload de archivos
  ├── login/                  # Página de login
  ├── dashboard/              # Dashboard principal
  │   ├── deudas/             # Gestión de deudas
  │   ├── pagos/              # Gestión de pagos
  │   └── admin/              # Panel administrativo
  ├── page.tsx                # Página principal (redirige)
  └── layout.tsx              # Layout raíz
components/
  ├── ui/                     # Componentes shadcn/ui
  ├── login-form.tsx          # Formulario de login
  └── dashboard-layout.tsx    # Layout del dashboard
lib/
  ├── auth.ts                 # Configuración NextAuth
  ├── prisma.ts               # Cliente Prisma
  ├── supabase.ts             # Cliente Supabase
  ├── utils.ts                # Utilidades (formatCurrency, etc)
  └── cn.ts                   # Utilidad de clases CSS
prisma/
  ├── schema.prisma           # Esquema de base de datos
  └── seed.ts                 # Script de seeding
config/
  └── users.json              # Usuarios iniciales
```

## Base de Datos

### Esquema

#### User
- `id`: string (CUID)
- `username`: string (única)
- `passwordHash`: string
- `role`: string ("admin" | "user")
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### Debt
- `id`: string (CUID)
- `creditorId`: string (FK User)
- `debtorId`: string (FK User)
- `amount`: int (en centavos)
- `description`: string?
- `date`: DateTime
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### Payment
- `id`: string (CUID)
- `fromUserId`: string (FK User)
- `toUserId`: string (FK User)
- `amount`: int (en centavos)
- `comment`: string?
- `receiptUrl`: string?
- `date`: DateTime
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Lógica de Negocio

### Cálculo de Balance
```
Balance Neto = Total de Deudas - Total de Pagos

Si Balance > 0 → El usuario debe dinero
Si Balance < 0 → Le deben dinero al usuario
Si Balance = 0 → Sin deudas pendientes
```

### Flujo de Pagos
1. Usuario registra un pago
2. Sistema valida que el pago vaya dirigido a otro usuario
3. Se sube la imagen del comprobante a Supabase Storage (opcional)
4. Se crea registro de pago en la base de datos
5. Balance se actualiza automáticamente

### Permisos
- **User**: Solo ve sus propias deudas y pagos
- **Admin**: Ve todos los registros, puede crear deudas

## Formato de Moneda

Se usa ARS (Pesos Argentinos) con formato local:
- Display: `$210.000` (sin decimales)
- Almacenamiento: en centavos (int)
- Ejemplo: 210.000 pesos = 21.000.000 centavos

## Variables de Entorno Requeridas

```env
# Base de Datos
DATABASE_URL=

# Autenticación
NEXTAUTH_SECRET=             # Generar con: openssl rand -base64 32
NEXTAUTH_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Despliegue

### Con Vercel
1. Conectar repositorio a Vercel
2. Configurar variables de entorno en settings
3. Ejecutar migraciones post-deployment:
```bash
npx prisma db push --skip-generate
```

### Consideraciones de Producción
- Cambiar `NEXTAUTH_SECRET` por un valor aleatorio seguro
- Usar URLs HTTPS
- Configurar CORS en Supabase si es necesario
- Revisar políticas RLS en Supabase Storage
- Verificar que las migraciones se ejecuten en el servidor

## Troubleshooting

### Error de Node Version
Si ves warnings sobre versión de Node, necesitas actualizar a v18 o superior:
```bash
node --version
nvm install 18
nvm use 18
```

### Error de conexión a Supabase
- Verificar que DATABASE_URL sea correcta
- Confirmar que las credenciales de Supabase son válidas
- Asegurar que la base de datos está creada

### Error en migraciones
```bash
# Resetear la base de datos completamente (¡borra datos!)
npx prisma db push --force-reset

# O si hay drift:
npx prisma migrate reset --force
```

### Imágenes no se suben
- Verificar que SUPABASE_SERVICE_ROLE_KEY está configurada
- Confirmar que el bucket "receipts" existe
- Revisar políticas de Supabase Storage

## Licencia

MIT

## Soporte

Para reportar bugs o sugerir features, abrir un issue en el repositorio.
