const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config } = require('../utils/dataManager');

const jobs = [
    { name: 'Software Developer', min: 50, max: 150, emoji: '💻' },
    { name: 'Streamer', min: 30, max: 100, emoji: '🎮' },
    { name: 'Content Creator', min: 40, max: 120, emoji: '📹' },
    { name: 'Designer', min: 45, max: 130, emoji: '🎨' },
    { name: 'Chef', min: 35, max: 90, emoji: '👨‍🍳' },
    { name: 'Musician', min: 25, max: 85, emoji: '🎵' },
    { name: 'Teacher', min: 40, max: 100, emoji: '👨‍🏫' },
    { name: 'Photographer', min: 30, max: 110, emoji: '📸' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Kerja untuk mendapatkan coins! 💼'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        initUser(userId, guildId);

        const user = userData[userId].guilds[guildId];
        const now = Date.now();
        const lastWork = user.lastWork || 0;
        const cooldownMs = 1 * 60 * 60 * 1000; // 1 jam cooldown

        // Cek cooldown
        if (now - lastWork < cooldownMs) {
            const timeLeft = cooldownMs - (now - lastWork);
            const minutes = Math.floor(timeLeft / (60 * 1000));

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('😴 Kamu Masih Capek!')
                .setDescription(`Istirahat dulu, kamu bisa kerja lagi dalam **${minutes} menit**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Random job
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        // Bonus untuk level tinggi (5% per 10 level)
        const userLevel = user.level || 1;
        const levelBonus = Math.floor(earned * (Math.floor(userLevel / 10) * 0.05));
        const totalEarned = earned + levelBonus;

        user.coins = (user.coins || 0) + totalEarned;
        user.lastWork = now;

        await saveData();

        const responses = [
            `Kamu kerja sebagai ${job.emoji} **${job.name}** dan dapat **${totalEarned}** coins!`,
            `Hari yang produktif! Kamu kerja sebagai ${job.emoji} **${job.name}** dan mendapat **${totalEarned}** coins!`,
            `Kerja keras membuahkan hasil! Kamu jadi ${job.emoji} **${job.name}** dan dapat **${totalEarned}** coins!`,
            `Boss kamu senang! Kamu kerja sebagai ${job.emoji} **${job.name}** dan dibayar **${totalEarned}** coins!`,
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setColor(config.colorthemecode || '#00FF00')
            .setTitle('💼 Work Complete!')
            .setDescription(response)
            .addFields(
                { name: '💰 Earned', value: `${earned} coins`, inline: true },
                { name: '⭐ Level Bonus', value: `+${levelBonus} coins`, inline: true },
                { name: '💎 Total Coins', value: `${user.coins}`, inline: true }
            )
            .setFooter({ text: 'Kamu bisa kerja lagi dalam 1 jam!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
