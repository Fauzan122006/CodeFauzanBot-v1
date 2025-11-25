const { 
    createAudioPlayer, 
    createAudioResource, 
    joinVoiceChannel, 
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');
const play = require('play-dl');
const ytdl = require('ytdl-core');
const { EmbedBuilder } = require('discord.js');

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.nowPlaying = null;
        this.volume = 100;
        this.loop = 'none'; // none, song, queue
        this.connection = null;
        this.player = createAudioPlayer();
        this.isPlaying = false;
        this.isPaused = false;
        this.textChannel = null;
        
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.handleSongEnd();
        });

        this.player.on('error', error => {
            console.error(`Audio player error in guild ${this.guildId}:`, error);
            this.handleSongEnd();
        });
    }

    async handleSongEnd() {
        if (this.loop === 'song' && this.nowPlaying) {
            await this.playSong(this.nowPlaying);
        } else if (this.loop === 'queue' && this.nowPlaying) {
            this.songs.push(this.nowPlaying);
            this.nowPlaying = null;
            await this.playNext();
        } else {
            this.nowPlaying = null;
            await this.playNext();
        }
    }

    async playSong(song) {
        try {
            // Validasi URL dulu
            if (!song.url || song.url === 'undefined') {
                console.error('Invalid song URL:', song);
                if (this.textChannel) {
                    await this.textChannel.send(`❌ Invalid URL for: ${song.title}`);
                }
                await this.playNext();
                return;
            }

            let stream;
            
            if (song.source === 'youtube') {
                stream = await play.stream(song.url);
            } else {
                stream = await play.stream(song.url);
            }

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });

            resource.volume.setVolume(this.volume / 100);
            this.player.play(resource);
            this.isPlaying = true;
            this.isPaused = false;
            this.nowPlaying = song;

            if (this.textChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('🎵 Now Playing')
                    .setDescription(`**[${song.title}](${song.url})**`)
                    .addFields(
                        { name: 'Duration', value: song.duration, inline: true },
                        { name: 'Requested by', value: song.requester, inline: true }
                    )
                    .setThumbnail(song.thumbnail)
                    .setTimestamp();

                await this.textChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error playing song:', error);
            if (this.textChannel) {
                await this.textChannel.send(`❌ Error playing: ${song.title}`);
            }
            await this.playNext();
        }
    }

    async playNext() {
        if (this.songs.length > 0) {
            const nextSong = this.songs.shift();
            await this.playSong(nextSong);
        } else {
            this.isPlaying = false;
            this.nowPlaying = null;
            if (this.textChannel) {
                await this.textChannel.send('✅ Queue finished!');
            }
        }
    }

    addSong(song) {
        this.songs.push(song);
    }

    clearQueue() {
        this.songs = [];
    }

    shuffle() {
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
        }
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.player.pause();
            this.isPaused = true;
            return true;
        }
        return false;
    }

    resume() {
        if (this.isPaused) {
            this.player.unpause();
            this.isPaused = false;
            return true;
        }
        return false;
    }

    stop() {
        this.player.stop();
        this.songs = [];
        this.nowPlaying = null;
        this.isPlaying = false;
        this.isPaused = false;
    }

    skip() {
        this.player.stop();
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(200, vol));
    }

    setLoop(mode) {
        this.loop = mode;
    }

    getQueue() {
        return this.songs;
    }

    remove(index) {
        if (index >= 0 && index < this.songs.length) {
            return this.songs.splice(index, 1)[0];
        }
        return null;
    }
}

const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, new MusicQueue(guildId));
    }
    return queues.get(guildId);
}

function deleteQueue(guildId) {
    const queue = queues.get(guildId);
    if (queue) {
        queue.stop();
        if (queue.connection) {
            queue.connection.destroy();
        }
        queues.delete(guildId);
    }
}

async function searchYouTube(query) {
    try {
        const yt_info = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (yt_info.length === 0) return null;
        
        const video = yt_info[0];
        
        // Pastikan URL valid
        if (!video.url) {
            console.error('No URL found for video:', video.title);
            return null;
        }
        
        return {
            title: video.title || 'Unknown Title',
            url: video.url,
            duration: formatDuration(video.durationInSec || 0),
            thumbnail: video.thumbnail?.url || video.thumbnails?.[0]?.url || '',
            source: 'youtube'
        };
    } catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}

async function getYouTubePlaylist(url) {
    try {
        const playlist = await play.playlist_info(url, { incomplete: true });
        const videos = await playlist.all_videos();
        
        return videos.slice(0, 50).map(video => ({
            title: video.title,
            url: video.url,
            duration: formatDuration(video.durationInSec),
            thumbnail: video.thumbnails[0]?.url || '',
            source: 'youtube'
        }));
    } catch (error) {
        console.error('Playlist error:', error);
        return null;
    }
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function createConnection(voiceChannel, queue) {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        connection.subscribe(queue.player);
        queue.connection = connection;
        
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                deleteQueue(voiceChannel.guild.id);
            }
        });

        return connection;
    } catch (error) {
        connection.destroy();
        throw error;
    }
}

module.exports = {
    getQueue,
    deleteQueue,
    searchYouTube,
    getYouTubePlaylist,
    createConnection,
    formatDuration
};
