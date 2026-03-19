# Deployment Guide

Guide for deploying ODM-CMMS to production environments.

## Local Deployment

### Windows (Easiest)

1. **Install Prerequisites**
   - [Node.js 18+](https://nodejs.org/)
   - [MySQL 8.0+](https://dev.mysql.com/downloads/installer/)

2. **Run Installer**
   ```
   Double-click install-windows.bat
   ```

3. **Access Application**
   - URL: http://localhost:3000
   - Admin: admin / admin123
   - Operator: operator1 / operator123

### Mac/Linux

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Initialize database
npm run db:init

# Start server
npm run dev
```

## Cloud Deployment Options

### Option 1: Railway (Free Tier)

Best for: Quick testing, small teams

**Cost:** $0 (with limits)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create MySQL Database**
   - New → Database → MySQL
   - Wait for provisioning

3. **Deploy Application**
   - New → Project → Deploy from GitHub
   - Select your repository
   - Railway auto-detects Dockerfile

4. **Configure Environment Variables**
   ```
   NODE_ENV=production
   JWT_SECRET=your-random-secret
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   ```

5. **Initialize Database**
   - Go to project shell
   - Run: `node src/utils/init-db.js`

### Option 2: DigitalOcean ($6/month)

Best for: Production use, full control

**Cost:** $6/month (droplet) + $10/year (domain)

1. **Create Droplet**
   - OS: Ubuntu 22.04
   - Plan: Basic ($6/month)
   - Datacenter: Closest to users

2. **Connect via SSH**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt-get install -y nodejs

   # Install MySQL
   apt install mysql-server -y
   mysql_secure_installation
   ```

4. **Setup Database**
   ```bash
   mysql -u root -p
   
   CREATE DATABASE odm_cmms;
   CREATE USER 'cmms'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON odm_cmms.* TO 'cmms'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Deploy Application**
   ```bash
   # Install PM2
   npm install -g pm2

   # Clone repository
   git clone https://github.com/yourusername/odm-cmms.git
   cd odm-cmms

   # Install dependencies
   npm install

   # Create .env
   cat > .env << 'EOF'
   PORT=3000
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=odm_cmms
   DB_USER=cmms
   DB_PASSWORD=password
   JWT_SECRET=your-secret-key
   EOF

   # Initialize database
   npm run db:init

   # Start with PM2
   pm2 start src/index.js --name "odm-cmms"
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx**
   ```bash
   apt install nginx -y

   # Create config
   cat > /etc/nginx/sites-available/odm-cmms << 'EOF'
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   EOF

   # Enable site
   ln -s /etc/nginx/sites-available/odm-cmms /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

7. **Setup SSL (HTTPS)**
   ```bash
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d your-domain.com
   ```

### Option 3: Docker Deployment

1. **Build Image**
   ```bash
   docker build -t odm-cmms .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e DB_HOST=mysql-host \
     -e DB_USER=root \
     -e DB_PASSWORD=password \
     --name odm-cmms \
     odm-cmms
   ```

3. **With Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DB_HOST=db
         - DB_USER=root
         - DB_PASSWORD=password
         - DB_NAME=odm_cmms
       depends_on:
         - db
     
     db:
       image: mysql:8.0
       environment:
         - MYSQL_ROOT_PASSWORD=password
         - MYSQL_DATABASE=odm_cmms
       volumes:
         - mysql_data:/var/lib/mysql
   
   volumes:
     mysql_data:
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `HOST` | Server host | localhost |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 3306 |
| `DB_NAME` | Database name | odm_cmms |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing key | - |
| `JWT_EXPIRES_IN` | Token expiry | 24h |

## SSL/HTTPS Setup

### Let's Encrypt (Free)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain certificate
certbot --nginx -d your-domain.com

# Auto-renewal test
certbot renew --dry-run
```

### Cloudflare (Free)

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers
4. Enable "Always Use HTTPS"

## Backup Strategy

### Database Backup

```bash
# Create backup
mysqldump -u root -p odm_cmms > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p odm_cmms < backup_20240101.sql
```

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * mysqldump -u root -pPASSWORD odm_cmms > /backups/cmms_$(date +\%Y\%m\%d).sql
```

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting Production

### Check Logs
```bash
# Application logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -u mysql
```

### Common Issues

**502 Bad Gateway**
- Check if Node.js app is running: `pm2 status`
- Check port configuration

**Database Connection Failed**
- Verify MySQL is running: `systemctl status mysql`
- Check credentials in .env

**Out of Memory**
- Add swap space
- Upgrade server RAM

## Domain Setup

### Buy Domain
- [Namecheap](https://namecheap.com) (~$10/year)
- [Cloudflare](https://cloudflare.com) (~$10/year)

### DNS Configuration
```
Type: A
Name: @
Value: Your-Server-IP
TTL: Auto
```

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Setup firewall (UFW)
- [ ] Regular backups
- [ ] Update dependencies
- [ ] Disable root SSH login
- [ ] Use SSH keys only
