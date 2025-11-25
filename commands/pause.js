const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        if (queue.paused) {
            return interaction.reply({ content: '❌ Already paused!', ephemeral: true });
        }

        queue.pause();
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setDescription('⏸️ Paused the music');
        return interaction.reply({ embeds: [embed] });
    },
};
