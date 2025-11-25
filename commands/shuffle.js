const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue || queue.songs.length < 2) {
            return interaction.reply({ content: '❌ Not enough songs in queue to shuffle!', ephemeral: true });
        }

        await queue.shuffle();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setDescription(`🔀 Shuffled **${queue.songs.length}** songs`);

        return interaction.reply({ embeds: [embed] });
    },
};
