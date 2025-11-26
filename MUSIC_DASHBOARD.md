# 🎵 Music Dashboard & Audio Quality Enhancement

## Fitur Baru

### 1. **Music Control Panel Interaktif**
Setiap kali music diputar, bot akan menampilkan panel kontrol interaktif dengan buttons:

#### Row 1 - Playback Controls
- 🔉 **Down** - Menurunkan volume 10%
- ⏮️ **Back** - Memutar lagu sebelumnya
- ⏸️ **Pause** - Pause/Resume musik
- ⏭️ **Skip** - Skip ke lagu berikutnya

#### Row 2 - Advanced Controls
- 🔊 **Up** - Menaikkan volume 10%
- 🔀 **Shuffle** - Acak urutan queue
- 🔁 **Loop** - Toggle loop mode (Off → Song → Queue)
- ⏹️ **Stop** - Stop musik dan clear queue

#### Row 3 - Extra Features
- 🔄 **AutoPlay** - Toggle autoplay related songs
- 📜 **Playlist** - Tampilkan queue

### 2. **Peningkatan Kualitas Audio**

#### Filter Audio Otomatis
- Bot secara otomatis menerapkan filter `clear` dengan `dynaudnorm=f=200` untuk kualitas audio terbaik
- Normalisasi audio dinamis untuk konsistensi volume

#### Custom Audio Filters
Gunakan command `/filter` untuk menerapkan berbagai filter:
- **Clear** - Kualitas terbaik dengan dynamic normalization
- **Bass Boost** - Meningkatkan bass dengan g=10
- **8D Audio** - Efek audio 3D surround
- **Nightcore** - Meningkatkan pitch dan tempo
- **Vaporwave** - Menurunkan pitch untuk efek retro
- **Treble** - Meningkatkan high frequencies
- **Surrounding** - Efek surround sound

### 3. **Konfigurasi DisTube**

```javascript
{
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(), 
        new YtDlpPlugin()
    ],
    customFilters: {
        "clear": "dynaudnorm=f=200",     // Auto normalization
        "bassboost": "bass=g=10,dynaudnorm=f=200",
        "8d": "apulsator=hz=0.09",
        // ... 15+ professional filters
    }
}
```

**Catatan:** Konfigurasi minimal untuk kompatibilitas DisTube v5.0.7+

## Commands Baru

### `/filter <type>`
Terapkan audio filter untuk meningkatkan kualitas suara
```
/filter type:clear          - Kualitas terbaik
/filter type:bassboost      - Bass boost
/filter type:8d             - 8D audio
/filter type:nightcore      - Nightcore effect
/filter type:off            - Hapus semua filter
```

## Commands yang Diupdate

### `/nowplaying`
Sekarang menampilkan:
- Informasi lagu lengkap dengan thumbnail
- Music panel dengan semua controls
- Author/Uploader information
- Interactive buttons untuk control

### `/play <query>`
Fitur yang ditingkatkan:
- Auto-apply clear filter untuk kualitas terbaik
- Support Spotify, YouTube, SoundCloud
- Tampilkan music panel otomatis

## Cara Menggunakan

1. **Mainkan musik:**
   ```
   /play query:Iman Troye, HARRY - kita
   ```

2. **Kontrol musik menggunakan buttons:**
   - Klik button yang tersedia di music panel
   - Semua kontrol bekerja secara real-time
   - Response ephemeral (hanya Anda yang melihat)

3. **Tingkatkan kualitas audio:**
   ```
   /filter type:clear
   ```

4. **Lihat status musik:**
   ```
   /nowplaying
   ```

## Fitur Tambahan

- ✅ Volume control dengan buttons (naik/turun 10%)
- ✅ Loop mode cycling (Off → Song → Queue → Off)
- ✅ Shuffle queue dengan sekali klik
- ✅ AutoPlay untuk musik kontinyu
- ✅ Queue display dengan pagination
- ✅ Audio normalization otomatis

## Screenshot
Lihat `contoh_fitur_music.png` untuk referensi tampilan dashboard.

## Technical Details

### Audio Quality Enhancements:
1. **Dynamic Audio Normalization** - Menjaga konsistensi volume
2. **High-quality filters** - 15+ filter profesional
3. **Automatic filter application** - Clear filter otomatis diterapkan
4. **Better codec handling** - Support multiple audio sources via plugins

### Button Interactions:
- All controls menggunakan ephemeral replies
- Error handling untuk semua operasi
- Real-time status updates
- Permission checks otomatis

### Available Audio Filters:

| Filter | Description | FFmpeg Filter |
|--------|-------------|---------------|
| clear | Dynamic normalization (Best Quality) | `dynaudnorm=f=200` |
| bassboost | Enhanced bass + normalization | `bass=g=10,dynaudnorm=f=200` |
| 8d | 3D surround sound effect | `apulsator=hz=0.09` |
| nightcore | Higher pitch & tempo | `aresample=48000,asetrate=48000*1.25` |
| vaporwave | Lower pitch retro effect | `aresample=48000,asetrate=48000*0.8` |
| phaser | Phaser effect | `aphaser=in_gain=0.4` |
| tremolo | Tremolo effect | `tremolo` |
| vibrato | Vibrato effect | `vibrato=f=6.5` |
| reverse | Reverse audio | `areverse` |
| treble | Enhanced high frequencies | `treble=g=5` |
| surrounding | Surround sound | `surround` |
| pulsator | Pulsator effect | `apulsator=hz=1` |
| subboost | Sub-bass boost | `asubboost` |
| karaoke | Karaoke mode (vocal reduction) | `stereotools=mlev=0.03` |
| flanger | Flanger effect | `flanger` |
| gate | Audio gate | `agate` |
| haas | Haas stereo enhancement | `haas` |
| mcompand | Multi-band compander | `mcompand` |

## Troubleshooting

### Buttons tidak muncul?
- Pastikan bot sudah di-restart setelah update
- Pastikan menggunakan DisTube v5.0.7 atau lebih baru
- Check console untuk error messages

### Audio quality tidak meningkat?
- Filter `clear` diterapkan otomatis saat musik diputar
- Coba manual dengan `/filter type:clear`
- Check apakah FFmpeg terinstall dengan benar

### Previous button tidak bekerja?
- DisTube v5 menyimpan history secara default
- History dimulai dari lagu pertama yang diputar setelah bot restart
- Minimal harus ada 1 lagu yang sudah dimainkan sebelumnya

## Credits
- DisTube v5.0.7+
- FFmpeg for audio processing
- Discord.js v14
