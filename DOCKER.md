# 🐳 Ejecutar con Docker

Esta guía te muestra cómo correr la aplicación completa con Docker sin necesidad de instalar Node.js o PostgreSQL.

## Requisitos Previos

- **Docker Desktop** instalado
  - Windows: https://www.docker.com/products/docker-desktop
  - Mac: https://www.docker.com/products/docker-desktop
  - Linux: https://docs.docker.com/engine/install/

Verifica que Docker está instalado:
```bash
docker --version
docker-compose --version
```

## 🚀 Iniciar la Aplicación

### Opción 1: Iniciar Todo Automáticamente (Recomendado)

```bash
docker-compose up
```

Esto hace:
✅ Crea la red de Docker
✅ Inicia PostgreSQL
✅ Instala dependencias de Node.js
✅ Ejecuta migraciones de Prisma
✅ Carga datos de seed (usuarios)
✅ Inicia el servidor en http://localhost:3000

**La primera ejecución toma 2-3 minutos**

### Opción 2: Modo Detached (Background)

```bash
docker-compose up -d
```

Ver logs:
```bash
docker-compose logs -f app
```

Ver solo errores:
```bash
docker-compose logs -f app | grep -i error
```

---

## 🎮 Acceder a la Aplicación

Una vez que veas:
```
> Ready in 1234ms
```

Abre en tu navegador:
- **App**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Health Check**: http://localhost:3000/api/health

### Usuarios de Prueba
```
Usuario: admin
Contraseña: admin123
Rol: Admin

Usuario: usuario1
Contraseña: admin123
Rol: User

Usuario: usuario2
Contraseña: admin123
Rol: User
```

---

## 🗄️ Base de Datos

### Acceder a PostgreSQL desde la terminal

```bash
# Conectarse a PostgreSQL en el contenedor
docker-compose exec postgres psql -U pagos_user -d pagos_db

# Ver tablas:
\dt

# Salir:
\q
```

### Credenciales PostgreSQL
- **Usuario**: pagos_user
- **Contraseña**: pagos_password_secure
- **Base de datos**: pagos_db
- **Host**: postgres (dentro de Docker), localhost:5433 (desde máquina host)
- **Puerto**: 5432 (dentro de Docker), 5433 (desde máquina host)

### Ver datos con Prisma Studio

```bash
docker-compose exec app npx prisma studio
```

Abre: http://localhost:5555

---

## 🛑 Detener la Aplicación

```bash
# Detener contenedores (sin eliminar datos)
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar contenedores Y volúmenes (borra la BD)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Puerto 3000 ya está en uso

```bash
# Ver qué proceso usa el puerto 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# O usar otro puerto en docker-compose.yml:
# ports:
#   - "3001:3000"  # Cambiar a 3001
```

### Puerto 5433 ya está en uso

```bash
# Cambiar en docker-compose.yml:
# ports:
#   - "5434:5432"  # Cambiar a 5434

# Y actualizar DATABASE_URL si es necesario
```

### La app no se conecta a la BD

```bash
# Ver logs:
docker-compose logs app

# Reiniciar contenedores:
docker-compose restart

# Forzar reconstrucción:
docker-compose down
docker-compose up --build
```

### Error: "permission denied"

En Linux, ejecuta con sudo:
```bash
sudo docker-compose up
```

O agrega tu usuario al grupo docker:
```bash
sudo usermod -aG docker $USER
newgrp docker
docker-compose up
```

### Limpiar todo (borrar contenedores, imágenes, volúmenes)

```bash
# ⚠️ CUIDADO: Esto borra TODO
docker-compose down -v
docker system prune -a
```

---

## 📊 Monitoreo

### Ver status de contenedores

```bash
docker-compose ps
```

### Ver consumo de recursos

```bash
docker stats
```

### Ver logs de un servicio específico

```bash
# App
docker-compose logs -f app

# Base de datos
docker-compose logs -f postgres

# Últimas 50 líneas
docker-compose logs --tail=50 app
```

---

## 🔄 Desarrollo

### Recargar código sin reiniciar

Los cambios en archivos se reflejan automáticamente en desarrollo.

Si no ves cambios:
```bash
docker-compose restart app
```

### Acceder a la terminal del contenedor

```bash
docker-compose exec app sh

# Dentro puedes:
npm run seed          # Recargar datos
npx prisma studio    # Ver BD
npx prisma db push   # Actualizar schema
exit                  # Salir
```

---

## 🌐 Supabase Storage (Opcional)

Para habilitar subida de imágenes, configura .env.local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-llave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

O edita estas variables en docker-compose.yml en la sección `environment` del servicio `app`.

---

## 📝 Estructura del docker-compose.yml

```yaml
services:
  postgres:           # Base de datos PostgreSQL
    - Volumen: postgres_data (persiste datos)
    - Puerto: 5433
    - Health check: cada 10s

  app:               # Aplicación Next.js
    - Depende de: postgres
    - Puerto: 3000
    - Volúmenes: código sincronizado
    - Ejecuta: migraciones, seed, npm run dev
```

---

## Soporte Adicional

- Documentación de Docker: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- Next.js en Docker: https://nextjs.org/docs/deployment/docker
