const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

function initializeMusic(client) {
    client.distube = new DisTube(client, {
        plugins: [
            new SpotifyPlugin(),
            new SoundCloudPlugin(),
            new YtDlpPlugin()
        ],
        // Konfigurasi untuk meningkatkan kualitas audio
        searchSongs: 5,
        searchCooldown: 30,
        leaveOnEmpty: true,
        leaveOnFinish: false,
        leaveOnStop: true,
        savePreviousSongs: true,
        emitNewSongOnly: true,
        emitAddSongWhenCreatingQueue: false,
        emitAddListWhenCreatingQueue: false,
        nsfw: false,
        // Audio quality settings
        youtubeDL: true,
        updateYouTubeDL: false,
        customFilters: {
            "clear": "dynaudnorm=f=200",
            "bassboost": "bass=g=10,dynaudnorm=f=200",
            "8d": "apulsator=hz=0.09",
            "vaporwave": "aresample=48000,asetrate=48000*0.8",
            "nightcore": "aresample=48000,asetrate=48000*1.25",
            "phaser": "aphaser=in_gain=0.4",
            "tremolo": "tremolo",
            "vibrato": "vibrato=f=6.5",
            "reverse": "areverse",
            "treble": "treble=g=5",
            "surrounding": "surround",
            "pulsator": "apulsator=hz=1",
            "subboost": "asubboost",
            "karaoke": "stereotools=mlev=0.03",
            "flanger": "flanger",
            "gate": "agate",
            "haas": "haas",
            "mcompand": "mcompand"
        }
    });

    // Enable autoplay by default for continuous music
    client.distube.on('playSong', (queue) => {
        // Auto-enable autoplay when queue has only 1 song
        if (!queue.autoplay && queue.songs.length <= 1) {
            try {
                queue.toggleAutoplay();
                console.log(`[DisTube] Autoplay enabled for guild ${queue.id}`);
            } catch (error) {
                console.error('[DisTube] Failed to enable autoplay:', error);
            }
        }
    });

    return client.distube;
}

module.exports = { initializeMusic };
