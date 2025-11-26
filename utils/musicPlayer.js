const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

function initializeMusic(client) {
    // Konfigurasi minimal DisTube v5 untuk kompatibilitas maksimal
    client.distube = new DisTube(client, {
        plugins: [
            new SpotifyPlugin(),
            new SoundCloudPlugin(),
            new YtDlpPlugin()
        ],
        // Custom audio filters untuk kualitas tinggi
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

    // Event handlers untuk auto-enable features
    client.distube.on('initQueue', (queue) => {
        // Set default volume
        queue.volume = 100;
    });

    return client.distube;
}

module.exports = { initializeMusic };
