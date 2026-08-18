# SGEC — Guía de despliegue en VPS

**Dominio:** https://sgec-escom.duckdns.org  
**VPS:** Ubuntu con Docker y Nginx instalados

---

## Paso 1 — Clonar el repo en el VPS

```bash
ssh root@2.24.210.132

cd /var/www
git clone https://github.com/Vicpip/SGEC.git sgec
cd sgec
```

---

## Paso 2 — Colocar los Dockerfiles en su lugar

Copia los archivos que se generaron junto a esta guía:

```bash
# En tu máquina local, sube los archivos al VPS:
scp Dockerfile.server root@2.24.210.132:/var/www/sgec/server/Dockerfile
scp Dockerfile.client root@2.24.210.132:/var/www/sgec/client/Dockerfile
scp nginx-spa.conf root@2.24.210.132:/var/www/sgec/client/nginx-spa.conf
scp docker-compose.yml root@2.24.210.132:/var/www/sgec/docker-compose.yml
```

O créalos directamente en el VPS con nano/vim copiando el contenido.

---

## Paso 3 — Crear el archivo .env en el VPS

```bash
cd /var/www/sgec
nano .env
```

Pega el contenido de `.env.production` y edita:
- `DB_PASSWORD` → una contraseña segura
- `JWT_SECRET` → genera uno con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

---

## Paso 4 — Exponer puertos en docker-compose.yml

Agrega los puertos al server y client para que Nginx del VPS pueda acceder:

En `docker-compose.yml`, en el servicio `server` agrega:
```yaml
ports:
  - "3001:3001"
```

En el servicio `client` agrega:
```yaml
ports:
  - "4000:80"
```

---

## Paso 5 — Levantar los contenedores

```bash
cd /var/www/sgec
docker compose up -d --build
```

Verifica que los 3 contenedores estén corriendo:
```bash
docker compose ps
```

Debe mostrar: `sgec_db`, `sgec_server`, `sgec_client` todos con status `Up`.

Verifica el backend:
```bash
curl http://localhost:3001/api/health
# Debe responder: {"status":"ok"}
```

---

## Paso 6 — Configurar Nginx en el VPS

```bash
# Copiar la configuración
cp /var/www/sgec/nginx-vps.conf /etc/nginx/sites-available/sgec

# Activar el sitio
ln -s /etc/nginx/sites-available/sgec /etc/nginx/sites-enabled/sgec

# Deshabilitar el default si existe
rm -f /etc/nginx/sites-enabled/default

# Verificar sintaxis
nginx -t

# Recargar Nginx (solo HTTP por ahora, antes del SSL)
systemctl reload nginx
```

---

## Paso 7 — Certificado SSL con Let's Encrypt

```bash
# Instalar certbot si no está
apt install certbot python3-certbot-nginx -y

# Generar certificado
certbot --nginx -d sgec-escom.duckdns.org

# Sigue las instrucciones:
# - Email: tu correo
# - Acepta términos: Y
# - Redirigir HTTP a HTTPS: 2 (Yes)
```

Certbot modifica automáticamente el nginx.conf con los paths del certificado.

Verifica que la renovación automática funciona:
```bash
certbot renew --dry-run
```

---

## Paso 8 — Verificación final

```bash
# Reiniciar todo limpio
systemctl reload nginx
docker compose restart
```

Abre en el navegador:
```
https://sgec-escom.duckdns.org
```

Debe mostrar la pantalla de login del SGEC con candado verde (HTTPS).

Prueba login con:
- admin@ipn.mx / Admin1234!
- mgarcia@ipn.mx / Profesor1234!
- s.ramirez@alumno.ipn.mx / Alumno1234!

---

## Actualizar el proyecto (cuando haya cambios)

```bash
cd /var/www/sgec
git pull origin main
docker compose up -d --build
```

---

## Comandos útiles

```bash
# Ver logs del backend
docker compose logs server -f

# Ver logs del frontend
docker compose logs client -f

# Ver logs de la BD
docker compose logs db -f

# Reiniciar un contenedor específico
docker compose restart server

# Detener todo
docker compose down

# Detener y borrar volúmenes (⚠️ borra la BD)
docker compose down -v
```
