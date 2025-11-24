const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Klaim hadiah harian kamu! 💰'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        initUser(userId, guildId);

        const user = userData[userId].guilds[guildId];
        const now = Date.now();
        const lastDaily = user.lastDaily || 0;
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Cek apakah sudah 24 jam sejak daily terakhir
        if (now - lastDaily < oneDayMs) {
            const timeLeft = oneDayMs - (now - lastDaily);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⏰ Kamu Sudah Klaim Daily!')
                .setDescription(`Kamu bisa klaim lagi dalam **${hours}h ${minutes}m**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Hitung streak
        const streak = user.dailyStreak || 0;
        const lastDailyDate = new Date(lastDaily).toDateString();
        const yesterdayDate = new Date(now - oneDayMs).toDateString();
        const isConsecutive = lastDailyDate === yesterdayDate;

        const newStreak = isConsecutive ? streak + 1 : 1;
        user.dailyStreak = newStreak;
        user.lastDaily = now;

        // Hitung reward (base + bonus streak)
        const baseReward = 100;
        const streakBonus = Math.min(newStreak * 10, 500); // Max 500 bonus
        const totalReward = baseReward + streakBonus;

        user.coins = (user.coins || 0) + totalReward;
        user.xp = (user.xp || 0) + 50; // Bonus XP

        await saveData();

        const embed = new EmbedBuilder()
            .setColor(config.colorthemecode || '#00FF00')
            .setTitle('💰 Daily Reward Claimed!')
            .setDescription(`**+${totalReward}** coins | **+50** XP`)
            .addFields(
                { name: '🔥 Streak', value: `${newStreak} hari`, inline: true },
                { name: '💎 Total Coins', value: `${user.coins}`, inline: true },
                { name: '🎁 Streak Bonus', value: `+${streakBonus} coins`, inline: true }
            )
            .setFooter({ text: `Datang lagi besok untuk melanjutkan streak!` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
