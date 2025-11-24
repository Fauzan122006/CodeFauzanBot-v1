# CodeFauzan Discord Bot

Discord bot dengan fitur lengkap untuk manajemen server, leveling system, automod, dan dashboard web.

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Bot

**Opsi A: Menggunakan Environment Variables (Recommended untuk Production)**
```bash
# Copy file .env.example ke .env
cp .env.example .env

# Edit file .env dan isi dengan kredensial Anda
```

**Opsi B: Menggunakan config.json (Untuk Development)**
```bash
# Edit file botconfig/config.json
# Ganti semua nilai placeholder dengan kredensial Anda
```

### 3. Mendapatkan Kredensial Discord

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik "New Application"
3. Masuk ke tab "Bot" dan klik "Add Bot"
4. Copy **Bot Token** (untuk `CLIENT_TOKEN`)
5. Di tab "OAuth2" > "General", copy:
   - **Client ID** (untuk `CLIENT_ID`)
   - **Client Secret** (untuk `CLIENT_SECRET`)
6. Tambahkan redirect URL: `http://localhost:3000/auth/discord/callback` (atau URL production Anda)

### 4. Mendapatkan API Keys (Opsional)

**YouTube API:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru
3. Aktifkan YouTube Data API v3
4. Buat kredensial API Key

**Spotify API:**
1. Buka [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. Buat aplikasi baru
3. Copy Client ID dan Client Secret

### 5. Jalankan Bot

```bash
# Jalankan bot dan dashboard
node index.js
```

Dashboard akan tersedia di: `http://localhost:3000`

## 🎯 Fitur Utama

### 1. **Dashboard Web**
- Pengaturan server via web interface
- Autentikasi Discord OAuth2
- Manajemen fitur per server

### 2. **Leveling System**
- XP per pesan
- Level-up otomatis
- Rank card dengan custom design
- Role rewards berdasarkan level
- Leaderboard

### 3. **Welcome System**
- Custom welcome message
- Welcome card dengan gambar
- Support text dan embed
- Custom font dan warna

### 4. **Auto Moderation**
- Anti Spam
- Anti Invite Links
- Anti Links (dengan whitelist)
- Mentions Spam Protection
- Caps Spam Protection
- Multiple punishment types (timeout, warn, kick, ban)

### 5. **Role Management**
- Auto role untuk member baru
- Auto role untuk bot
- Role selection menu
- Custom role categories

### 6. **Rules System**
- HTML editor untuk rules
- Auto-convert ke Markdown
- Role assignment saat accept rules
- Custom embed styling

### 7. **Achievement System**
- Custom achievements
- Auto notification
- Progress tracking

### 8. **YouTube Integration**
- Auto-post video baru
- Channel monitoring
- Custom notification

## 📁 Struktur Project

```
CodeFauzanBot-v1/
├── botconfig/          # Konfigurasi bot
│   ├── config.json     # Config utama (JANGAN COMMIT!)
│   ├── serverList.json # Data per server
│   └── ...
├── commands/           # Slash commands
├── events/            # Event handlers
├── middleware/        # Express middleware
├── utils/             # Helper functions
├── views/             # EJS templates untuk dashboard
├── fonts/             # Custom fonts
├── database/          # User data
├── index.js           # Entry point
└── dashboard.js       # Web dashboard
```

## 🔧 Commands

Bot menggunakan prefix `!!` (dapat diubah di config).

**Leveling:**
- `!!rank` - Lihat rank card Anda
- `!!leaderboard` - Top 10 leaderboard
- `!!balance` - Cek coin Anda

**Admin:**
- `!!set-level <user> <level>` - Set level user
- `!!warn <user> <reason>` - Warn user
- Gunakan dashboard untuk pengaturan lainnya

## 🛠️ Troubleshooting

### Canvas Module Error (Pterodactyl/VPS)
**Error:** `invalid ELF header` atau `ERR_DLOPEN_FAILED`

**Solusi:**
```bash
# Method 1: Rebuild canvas module
npm rebuild canvas --build-from-source

# Method 2: Clean install (jika method 1 gagal)
rm -rf node_modules package-lock.json
npm install
npm rebuild canvas --build-from-source

# Method 3: Install system dependencies (untuk Debian/Ubuntu)
apt-get update
apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas --build-from-source
```

**Catatan:** Bot akan tetap berjalan meskipun canvas module gagal load. Welcome cards dan rank cards akan dinonaktifkan sementara, tapi semua fitur lain tetap berfungsi normal.

### Dashboard "Members didn't arrive in time"
**Fixed:** Bot sekarang menggunakan member cache yang ada tanpa fetching untuk menghindari timeout di server besar. Statistik online members akan dihitung dari cache yang tersedia.

### Deprecation Warning: punycode module
**Status:** Warning ini berasal dari dependencies dan tidak mempengaruhi fungsionalitas bot. Akan diupdate pada versi berikutnya.

### Bot tidak bisa login
- Pastikan `CLIENT_TOKEN` valid dan benar
- Cek apakah bot token sudah di-reset di Discord Developer Portal

### Dashboard error 404 saat akses guild
- Pastikan bot sudah ada di server
- Pastikan user memiliki permission Administrator
- Cek apakah `CLIENT_ID` dan `CLIENT_SECRET` benar

### Welcome message tidak muncul
- Cek apakah fitur enabled di dashboard
- Pastikan channel welcome sudah dipilih
- Cek permission bot di channel tersebut

### Automod tidak berfungsi
- Pastikan fitur enabled di dashboard
- Cek apakah bot punya permission `MODERATE_MEMBERS`
- Pastikan role bot lebih tinggi dari target user

### Font tidak muncul di rank card
- Letakkan file font (.ttf atau .otf) di folder `fonts/`
- Restart bot setelah menambah font baru

## 📝 Update Log

### Latest Fixes (v1.1.0)
1. ✅ **Critical Fix**: Canvas module now optional - bot runs even if canvas fails to load
2. ✅ **Performance**: Dashboard no longer fetches members, uses cache only (fixes timeout)
3. ✅ **Security**: Removed exposed tokens from config.json
4. ✅ **Bug Fix**: Fixed duplicate member variable in messageCreate.js
5. ✅ **Bug Fix**: Removed duplicate XP gain logic
6. ✅ **Bug Fix**: Fixed level-up handler being called twice
7. ✅ **Improvement**: Added better error handling for automod
8. ✅ **Improvement**: Added return statements after punishment to prevent multiple triggers
9. ✅ **Improvement**: Fixed deprecated `displayAvatarURL` format parameter
10. ✅ **Improvement**: Added optional chaining for safer property access
11. ✅ **Bug Fix**: Fixed ensureAdmin middleware to use permissions from OAuth2 data
12. ✅ **Enhancement**: Added fallback text welcome when canvas unavailable
13. ✅ **Enhancement**: Added comprehensive error handling for Pterodactyl deployment

### Previous Updates
- Initial release with all core features

## 📞 Support

Jika menemukan bug atau punya pertanyaan:
1. Cek file log untuk error messages
2. Baca dokumentasi Discord.js: https://discord.js.org/

## 📄 License

ISC License

---

**Dibuat oleh CodeFauzan**
