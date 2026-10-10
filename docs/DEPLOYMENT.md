# Production Deployment & Service Management Guide

This guide describes how to run Apex LMS as a permanent background service on **Windows** and **Linux** servers.

---

## 🪟 1. Running as a Windows Service (NSSM)

To ensure the LMS starts automatically when the college server PC boots up (without requiring user login):

### Step 1: Download NSSM (Non-Sucking Service Manager)
Download NSSM from [nssm.cc](https://nssm.cc/) and place `nssm.exe` in `C:\Windows\System32`.

### Step 2: Install the Service
Open Command Prompt or PowerShell as **Administrator** and run:
```cmd
nssm install ApexLMS "C:\Program Files\nodejs\node.exe" "C:\path\to\apex-lms\server.js"
nssm set ApexLMS AppDirectory "C:\path\to\apex-lms"
nssm set ApexLMS AppEnvironmentExtra NODE_ENV=production PORT=3000
nssm set ApexLMS AppStdout "C:\path\to\apex-lms\logs\service.log"
nssm set ApexLMS AppStderr "C:\path\to\apex-lms\logs\error.log"
nssm start ApexLMS
```

### Step 3: Verify Service Status
```cmd
nssm status ApexLMS
```

---

## 🐧 2. Linux Production Deployment (PM2 & systemd)

### Using PM2 Process Manager (Recommended)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Navigate to project folder
cd /var/www/apex-lms

# Start LMS process
pm2 start server.js --name "apex-lms"

# Configure PM2 to restart on server reboot
pm2 startup
pm2 save
```

### Using native systemd service
Create `/etc/systemd/system/apex-lms.service`:
```ini
[Unit]
Description=Apex College Library Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/apex-lms
ExecStart=/usr/bin/node /var/www/apex-lms/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable apex-lms
sudo systemctl start apex-lms
```

---

## 🔒 3. Nginx Reverse Proxy & SSL Configuration (Optional)

If exposing Apex LMS over campus HTTPS:

```nginx
server {
    listen 80;
    server_name library.college.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name library.college.edu;

    ssl_certificate /etc/ssl/certs/library.crt;
    ssl_certificate_key /etc/ssl/private/library.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```
