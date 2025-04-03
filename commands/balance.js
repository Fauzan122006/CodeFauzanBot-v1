const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userData } = require('../utils/userDataHandler');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Cek jumlah koinmu.'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        if (!userData[userId]?.guilds?.[guildId]) {
            await interaction.reply({ content: 'Kamu belum memiliki data di server ini!', ephemeral: true });
            return;
        }

        const coins = userData[userId].guilds[guildId].coins || 0;
        const embed = new EmbedBuilder()
            .setTitle('💰 Saldo Koinmu')
            .setDescription(`Kamu memiliki **${coins} koin** di server ini!`)
            .setColor(config.colorthemecode || '#00BFFF');

        await interaction.reply({ embeds: [embed] });
    },
};