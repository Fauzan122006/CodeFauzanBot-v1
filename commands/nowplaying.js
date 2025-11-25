const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
            .setColor('#00BFFF')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: song.formattedDuration, inline: true },
                { name: 'Requested by', value: song.user.tag, inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true },
                { name: 'Status', value: queue.paused ? '⏸️ Paused' : '▶️ Playing', inline: true },
                { name: 'Queue', value: `${queue.songs.length} song(s)`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
