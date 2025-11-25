const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    async execute(interaction) {
        const queue = getQueue(interaction.guildId);

        if (!queue.nowPlaying) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const song = queue.nowPlaying;
        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: song.duration, inline: true },
                { name: 'Requested by', value: song.requester, inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true },
                { name: 'Loop', value: queue.loop, inline: true },
                { name: 'Status', value: queue.isPaused ? '⏸️ Paused' : '▶️ Playing', inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
