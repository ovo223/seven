# Deploy to Your Own Server

This project can run on a Linux server with Docker and Nginx.

## 1. Server requirements

- Ubuntu 22.04 or newer
- Docker
- Docker Compose
- Nginx
- A domain name pointing to the server IP

## 2. Upload the project

Upload this project folder to the server, for example:

```bash
/www/ai-employee-platform
```

## 3. Create production env file

Create a `.env` file on the server:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
ADMIN_SESSION_SECRET=change-this-to-a-long-random-string
```

Use a strong password before going online.

## 4. Start the app

```bash
docker compose up -d --build
```

The app will run on:

```text
http://127.0.0.1:3000
```

## 5. Nginx reverse proxy

Create an Nginx site config:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

After the domain points to the server, install an SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

## 7. URLs

- Frontend: `https://your-domain.com`
- Admin: `https://your-domain.com/admin`
- Admin login: `https://your-domain.com/admin/login`

