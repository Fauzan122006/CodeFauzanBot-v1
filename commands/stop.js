const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        await queue.stop();

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('⏹️ Stopped the music and cleared the queue');

        return interaction.reply({ embeds: [embed] });
    },
};
