# Pterodactyl Setup Instructions

## Canvas Module Error Fix

Jika Anda mendapat error `invalid ELF header` saat menjalankan bot di Pterodactyl, ikuti langkah berikut:

### Method 1: Rebuild Canvas (Recommended)
```bash
npm rebuild canvas --build-from-source
```

### Method 2: Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
npm rebuild canvas --build-from-source
```

### Method 3: Install Dependencies
Jika masih error, install dependencies system:
```bash
apt-get update
apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas --build-from-source
```

## Startup Command
```
npm start
```

## Important Notes
- Bot akan tetap berjalan meskipun canvas module gagal load
- Welcome cards dan rank cards akan dinonaktifkan jika canvas tidak tersedia
- Semua fitur lain akan tetap berfungsi normal
