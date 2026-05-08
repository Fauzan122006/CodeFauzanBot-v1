const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const song = queue.songs[0];
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎵 Now Playing')
            .setDescription(`🎵 **[${song.name}](${song.url})**`)
            .addFields(
                { name: '🎤 Requested By', value: `${song.user}`, inline: true },
                { name: '🎵 Music Duration', value: song.formattedDuration, inline: true },
                { name: '🎸 Music Author', value: song.uploader?.name || 'Unknown', inline: true }
            )
            .setThumbnail(song.thumbnail);

        // Create music control buttons - Row 1
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('Down')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('Back')
                    .setEmoji('⏮️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel(queue.paused ? 'Resume' : 'Pause')
                    .setEmoji(queue.paused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Create music control buttons - Row 2
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setLabel('Up')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('Shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('Loop')
                    .setEmoji('🔁')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

        // Create music control buttons - Row 3
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_autoplay')
                    .setLabel('AutoPlay')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Playlist')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Secondary)
            );

        const musicPanel = new EmbedBuilder()
            .setColor('#5865F2')
            .setDescription('**MUSIC PANEL**')
            .setTimestamp();

        return interaction.reply({ 
            embeds: [embed, musicPanel], 
            components: [row1, row2, row3]
        });
    },
};
