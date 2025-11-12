# Deployment Guide - AWS EC2

## Pre-deployment Checklist

- [ ] ติดตั้ง dependencies: `npm install`
- [ ] ตั้งค่า `.env` file
- [ ] ทดสอบ local: `npm start`
- [ ] เชื่อมต่อ MongoDB Atlas
- [ ] เตรียม AWS account

## AWS EC2 Deployment

### 1. Launch EC2 Instance

```bash
# เลือก: Ubuntu Server 22.04 LTS
# Instance type: t2.micro (Free Tier) หรือ t3.small
# Storage: 20GB GP3
# Security Group: เปิด port 22, 80, 443
```

### 2. Connect to EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 3. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### 4. Clone & Setup Project

```bash
# Clone repository
cd /home/ubuntu
git clone <your-repo-url> lottery-app
cd lottery-app

# Install dependencies
npm install

# Create .env file
nano .env
```

Paste this:
```
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lottery
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

### 5. Start with PM2

```bash
# Start application
pm2 start server.js --name lottery-app

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
# Copy and run the command it provides

# Monitor logs
pm2 logs lottery-app

# Other useful PM2 commands
pm2 status
pm2 restart lottery-app
pm2 stop lottery-app
pm2 delete lottery-app
```

### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/lottery
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/lottery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow prompts and select option 2 (redirect HTTP to HTTPS)

### 8. Auto-renewal SSL

```bash
sudo certbot renew --dry-run
```

## MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a FREE cluster (M0)
3. Create Database User:
   - Username: `lottery_admin`
   - Password: (generate strong password)
4. Network Access:
   - Add IP: `0.0.0.0/0` (for testing)
   - Later: Add specific EC2 IP
5. Get Connection String:
   - Connect → Drivers → Node.js
   - Copy connection string
   - Replace `<password>` with your password

## Monitoring

### Check Application Status
```bash
pm2 status
pm2 logs lottery-app
pm2 monit
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
tail -f /var/log/nginx/error.log
```

### Check System Resources
```bash
htop
df -h
free -h
```

## Update Deployment

```bash
cd /home/ubuntu/lottery-app
git pull origin main
npm install
pm2 restart lottery-app
```

## Security Best Practices

1. **Firewall Setup:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Disable Root Login:**
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

3. **Setup Fail2ban:**
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Cost Estimation (Monthly)

- **EC2 t2.micro**: $8-10 (Free for 12 months)
- **MongoDB Atlas M0**: $0 (512MB free forever)
- **Route 53 (Domain)**: ~$1/month
- **Data Transfer**: ~$1-5/month
- **CloudWatch**: ~$0-2/month

**Total: $10-20/month** (after free tier)

## Troubleshooting

### Application won't start
```bash
pm2 logs lottery-app --lines 100
```

### MongoDB connection error
```bash
# Test connection
node -e "require('mongoose').connect('your-mongodb-uri').then(() => console.log('OK')).catch(e => console.log(e))"
```

### Nginx error
```bash
sudo nginx -t
tail -f /var/log/nginx/error.log
```

### Port already in use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

## Support

For issues, check:
- Application logs: `pm2 logs lottery-app`
- Nginx logs: `/var/log/nginx/error.log`
- System logs: `journalctl -xe`
