const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, searchYouTube, getYouTubePlaylist, createConnection } = require('../utils/musicPlayer');
const play = require('play-dl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.editReply('❌ I need permissions to join and speak in your voice channel!');
        }

        const query = interaction.options.getString('query');
        const queue = getQueue(interaction.guildId);
        queue.textChannel = interaction.channel;

        try {
            let songs = [];
            const isPlaylist = query.includes('list=');
            const isUrl = query.startsWith('http');

            if (isPlaylist) {
                const playlistSongs = await getYouTubePlaylist(query);
                if (!playlistSongs || playlistSongs.length === 0) {
                    return interaction.editReply('❌ Could not load playlist!');
                }

                songs = playlistSongs.map(song => ({
                    ...song,
                    requester: interaction.user.tag
                }));

                const embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('📃 Playlist Added')
                    .setDescription(`Added **${songs.length}** songs to queue`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else {
                let songInfo;
                
                if (isUrl) {
                    try {
                        const info = await play.video_info(query);
                        songInfo = {
                            title: info.video_details.title || 'Unknown Title',
                            url: info.video_details.url || query,
                            duration: formatDuration(info.video_details.durationInSec || 0),
                            thumbnail: info.video_details.thumbnails?.[0]?.url || '',
                            source: 'youtube',
                            requester: interaction.user.tag
                        };
                    } catch (error) {
                        console.error('Error getting video info:', error);
                        return interaction.editReply('❌ Could not load video from URL!');
                    }
                } else {
                    songInfo = await searchYouTube(query);
                    if (!songInfo) {
                        return interaction.editReply('❌ No results found!');
                    }
                    console.log('Search result:', songInfo); // Debug
                    songInfo.requester = interaction.user.tag;
                }

                songs.push(songInfo);

                const embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('✅ Added to Queue')
                    .setDescription(`**[${songInfo.title}](${songInfo.url})**`)
                    .addFields(
                        { name: 'Duration', value: songInfo.duration, inline: true },
                        { name: 'Position', value: `${queue.songs.length + 1}`, inline: true }
                    )
                    .setThumbnail(songInfo.thumbnail)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

            songs.forEach(song => queue.addSong(song));

            if (!queue.connection) {
                await createConnection(voiceChannel, queue);
            }

            if (!queue.isPlaying) {
                await queue.playNext();
            }

        } catch (error) {
            console.error('Play command error:', error);
            await interaction.editReply('❌ An error occurred while playing the song!');
        }
    },
};

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
