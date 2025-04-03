const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config } = require('../utils/dataManager');

const shopItems = {
    "vip-role": { name: "VIP Role", price: 1000, roleId: "ROLE_ID_HERE" },
    "custom-color": { name: "Custom Color Role", price: 500, roleId: "ROLE_ID_HERE" }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Lihat toko server dan beli item.'),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guildId;
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop-buy')
            .setPlaceholder('Pilih item untuk dibeli...')
            .addOptions(
                Object.entries(shopItems).map(([id, item]) => ({
                    label: `${item.name} - ${item.price} koin`,
                    value: id
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const embed = new EmbedBuilder()
            .setTitle('🛒 Toko Server')
            .setDescription('Pilih item untuk dibeli dengan koinmu!')
            .setColor(config.colorthemecode || '#00BFFF'); // Fallback ke #00BFFF jika colorthemecode tidak valid

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};