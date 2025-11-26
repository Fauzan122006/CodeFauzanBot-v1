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
        ]
    });

    // Enable autoplay by default for continuous music
    client.distube.on('playSong', (queue) => {
        // Auto-enable autoplay when queue has only 1 song
        if (!queue.autoplay && queue.songs.length === 1) {
            queue.toggleAutoplay();
            console.log(`[DisTube] Autoplay enabled for guild ${queue.id}`);
        }
    });

    return client.distube;
}

module.exports = { initializeMusic };
