const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Lempar koin untuk gambling!')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Pilih heads atau tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads 🪙', value: 'heads' },
                    { name: 'Tails 🪙', value: 'tails' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Jumlah coins yang ingin dipertaruhkan')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction) {
        await interaction.deferReply();

        const { userData, initUser, saveData } = require('../utils/userDataHandler');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        initUser(userId, guildId);

        const user = userData[userId].guilds[guildId];
        const choice = interaction.options.getString('choice');
        const amount = interaction.options.getInteger('amount');

        // Cek apakah user punya cukup coins
        if ((user.coins || 0) < amount) {
            await interaction.editReply({ 
                content: `❌ Kamu tidak punya cukup coins! Kamu punya **${user.coins || 0}** coins.` 
            });
            return;
        }

        // Flip coin
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choice;

        if (won) {
            user.coins += amount;
        } else {
            user.coins -= amount;
        }

        await saveData();

        const embed = new EmbedBuilder()
            .setColor(won ? '#00FF00' : '#FF0000')
            .setTitle('🪙 Coin Flip!')
            .setDescription(`Koin mendarat di **${result === 'heads' ? 'Heads 🪙' : 'Tails 🪙'}**!`)
            .addFields(
                { name: 'Pilihan Kamu', value: choice === 'heads' ? 'Heads 🪙' : 'Tails 🪙', inline: true },
                { name: 'Hasil', value: won ? '✅ MENANG!' : '❌ KALAH!', inline: true },
                { name: 'Coins', value: won ? `+${amount}` : `-${amount}`, inline: true },
                { name: 'Total Coins', value: `${user.coins}`, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
