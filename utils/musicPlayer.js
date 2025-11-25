const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');

function initializeMusic(client) {
    client.distube = new DisTube(client, {
        emitNewSongOnly: true,
        leaveOnEmpty: true,
        leaveOnFinish: false,
        leaveOnStop: true,
        savePreviousSongs: true,
        searchSongs: 5,
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
