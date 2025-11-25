const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        if (!queue.paused) {
            return interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
        }

        queue.resume();
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription('▶️ Resumed the music');
        return interaction.reply({ embeds: [embed] });
    },
};
