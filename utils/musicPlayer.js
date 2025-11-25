const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

function initializeMusic(client) {
    client.distube = new DisTube(client, {
        emitNewSongOnly: true,
        savePreviousSongs: true,
        nsfw: false,
        emptyCooldown: 60,
        plugins: [
            new SpotifyPlugin(),
            new SoundCloudPlugin(),
            new YtDlpPlugin()
        ]
    });

    return client.distube;
}

module.exports = { initializeMusic };
