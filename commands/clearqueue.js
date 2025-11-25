const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear all songs from the queue'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue || queue.songs.length <= 1) {
            return interaction.reply({ content: '❌ Queue is already empty!', ephemeral: true });
        }

        const count = queue.songs.length - 1;
        
        // Keep first song (now playing), remove the rest
        queue.songs = [queue.songs[0]];

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`🗑️ Cleared **${count}** songs from the queue`);

        return interaction.reply({ embeds: [embed] });
    },
};
