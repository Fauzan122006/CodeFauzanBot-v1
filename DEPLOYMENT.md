# 🎯 Bug Fixes Summary & Deployment Guide

## ✅ Bugs yang Sudah Diperbaiki

### 1. ❌ Canvas Module Error di Pterodactyl
**Error:** `invalid ELF header - ERR_DLOPEN_FAILED`

**Root Cause:** Canvas module dikompilasi untuk Windows, tidak kompatibel dengan Linux di Pterodactyl

**Solution Applied:**
- ✅ Canvas module sekarang OPTIONAL
- ✅ Bot tetap jalan meskipun canvas gagal load
- ✅ Welcome cards & rank cards auto-disabled jika canvas unavailable
- ✅ Fallback ke text welcome message
- ✅ Error handling yang proper

**Cara Rebuild di Pterodactyl:**
```bash
npm rebuild canvas --build-from-source
```

### 2. ❌ Dashboard Error "Members didn't arrive in time"
**Error:** Timeout saat fetching members di server besar

**Root Cause:** Mencoba fetch semua members dengan timeout yang ketat

**Solution Applied:**
- ✅ Tidak lagi fetch members
- ✅ Gunakan cache yang sudah ada
- ✅ Online member count dari cache saja
- ✅ Dashboard load jauh lebih cepat

### 3. ❌ Deprecation Warning: punycode module
**Warning:** `DeprecationWarning: The punycode module is deprecated`

**Status:** 
- ⚠️ Warning dari dependency (tidak berbahaya)
- ℹ️ Tidak mempengaruhi fungsionalitas
- 📝 Will be fixed in future npm updates

---

## 🚀 Deployment Guide

### Local Development (Windows/Mac/Linux)
```bash
# 1. Clone repository
git clone <repo-url>
cd CodeFauzanBot-v1

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env dengan kredensial Anda

# 4. Setup config
# Edit botconfig/config.json dengan credentials

# 5. Run bot
npm start
```

### Pterodactyl/VPS Deployment (Linux)
```bash
# 1. Upload files ke server
# (gunakan SFTP atau git clone)

# 2. Install dependencies
npm install

# 3. IMPORTANT: Rebuild canvas untuk Linux
npm rebuild canvas --build-from-source

# Jika gagal, install system dependencies:
apt-get update
apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas --build-from-source

# 4. Setup environment
# Edit .env atau botconfig/config.json

# 5. Start bot
npm start

# Atau gunakan startup command di Pterodactyl:
# npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

# Install canvas dependencies
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm rebuild canvas --build-from-source

COPY . .
CMD ["npm", "start"]
```

---

## 📋 Pre-Deployment Checklist

### Required Configuration
- [ ] `CLIENT_TOKEN` - Bot token dari Discord Developer Portal
- [ ] `CLIENT_ID` - Application ID
- [ ] `CLIENT_SECRET` - OAuth2 client secret
- [ ] `CALLBACK_URL` - OAuth callback URL (production URL)
- [ ] `SESSION_SECRET` - Random secret untuk session

### Optional Configuration
- [ ] `YOUTUBE_API_KEY` - Untuk YouTube notifications
- [ ] `SPOTIFY_CLIENT_ID` - Untuk Spotify integration
- [ ] `SPOTIFY_CLIENT_SECRET` - Untuk Spotify integration

### Discord Bot Setup
- [ ] Bot created di Discord Developer Portal
- [ ] Bot invited ke server dengan Administrator permission
- [ ] OAuth2 redirect URL added: `YOUR_DOMAIN/auth/discord/callback`
- [ ] Privileged Gateway Intents enabled:
  - [x] Presence Intent
  - [x] Server Members Intent
  - [x] Message Content Intent

### Server Requirements
- [ ] Node.js v18 atau lebih tinggi
- [ ] npm v8 atau lebih tinggi
- [ ] Port 3000 available (atau sesuai config)
- [ ] Internet connection stabil

---

## 🔍 Post-Deployment Verification

### 1. Check Bot Status
```bash
# Bot should log:
✅ "Successfully loaded X commands"
✅ "Successfully loaded X events"
✅ "Logged in as BotName#1234"
✅ "Dashboard running on http://localhost:3000"
```

### 2. Check Dashboard Access
- Visit: `http://localhost:3000` (atau domain production)
- Login dengan Discord OAuth
- Pilih server
- Verify semua menu accessible

### 3. Check Features
- [ ] Dashboard loads tanpa error
- [ ] Welcome system functional (atau disabled jika canvas fail)
- [ ] Commands respond
- [ ] Automod active jika enabled
- [ ] Leveling system tracking XP
- [ ] Role management working

### 4. Check Logs
```bash
# Should NOT see:
❌ "Error logging in"
❌ "Guild not found"
❌ Unhandled rejection errors

# OK to see (jika canvas unavailable):
⚠️ "Canvas module not available"
⚠️ "Welcome cards will be disabled"
```

---

## 🐛 Common Issues & Solutions

### Issue: Bot tidak online
**Solutions:**
1. Check token di .env atau config.json
2. Verify token belum expired/reset
3. Check internet connection
4. Check console for error messages

### Issue: Dashboard 404/Not Found
**Solutions:**
1. Verify bot sudah di server
2. Check user punya Admin permission
3. Verify CLIENT_ID dan CLIENT_SECRET benar
4. Check CALLBACK_URL sesuai

### Issue: Canvas error di Pterodactyl
**Solutions:**
```bash
# Quick fix - bot akan jalan tanpa welcome cards
npm start

# Proper fix - rebuild canvas
npm rebuild canvas --build-from-source

# If still failing - install dependencies
apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas --build-from-source
```

### Issue: Permission errors
**Solutions:**
1. Ensure bot has Administrator permission
2. Check bot role position (higher than managed roles)
3. Verify channel permissions

### Issue: Commands not working
**Solutions:**
1. Wait 1 hour for slash commands to register globally
2. Or kick & re-invite bot to force re-register
3. Check bot has "applications.commands" scope

---

## 📊 Performance Monitoring

### Memory Usage
- Expected: 150-300 MB
- Max: 500 MB
- If higher: Check for memory leaks

### CPU Usage
- Idle: <5%
- Active: 10-30%
- If higher: Check for infinite loops

### Response Time
- Dashboard: <2 seconds
- Commands: <1 second
- Welcome messages: <3 seconds

---

## 🆘 Emergency Procedures

### Bot Crash Recovery
```bash
# Check logs
tail -f logs/bot.log

# Restart bot
pm2 restart CodeFauzanBot

# Or
npm start
```

### Database Corruption
```bash
# Backup current data
cp botconfig/serverList.json botconfig/serverList.json.backup
cp database/userData.json database/userData.json.backup

# Restore from backup if needed
cp botconfig/serverList.json.backup botconfig/serverList.json
```

### Rate Limit Issues
- Bot will auto-handle rate limits
- Wait for cooldown period
- Reduce command frequency if persistent

---

## 📞 Support

Jika masih ada masalah setelah mengikuti panduan ini:

1. **Check Logs**
   - Console output
   - Error messages
   - Stack traces

2. **Verify Configuration**
   - Double-check all credentials
   - Ensure proper permissions
   - Check Discord Developer Portal settings

3. **System Requirements**
   - Node.js version
   - System dependencies
   - Available memory

4. **Documentation**
   - README.md
   - CHANGELOG.md
   - PTERODACTYL_SETUP.md

---

**Last Updated:** 2025-11-24
**Version:** 1.1.0
**Status:** ✅ Production Ready
