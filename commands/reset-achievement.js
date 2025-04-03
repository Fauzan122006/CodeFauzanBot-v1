const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { userData, saveData } = require('../utils/userDataHandler');
const chalk = require('chalk'); // Import chalk untuk warna

// Fungsi untuk log dengan timestamp dan warna
const log = (module, message, level = 'info') => {
    const timestamp = new Date().toISOString();
    let coloredMessage;

    switch (level.toLowerCase()) {
        case 'success':
            coloredMessage = chalk.cyan(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'error':
            coloredMessage = chalk.red(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'warning':
            coloredMessage = chalk.yellow(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'info':
        default:
            coloredMessage = chalk.white(`[${timestamp}] [${module}] ${message}`);
            break;
    }

    console.log(coloredMessage);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-achievement')
        .setDescription('Reset achievement untuk user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang achievement-nya mau direset.')
                .setRequired(true)),
    async execute(interaction) {
        // Pastikan ini slash command
        if (!interaction.isChatInputCommand()) {
            log('ResetAchievement', `Command reset-achievement was called as a prefix command by ${interaction.author?.id || 'unknown user'}`, 'warning');
            return; // Abaikan kalau bukan slash command
        }

        // Defer reply biar gak timeout kalau proses lama
        await interaction.deferReply();

        // Cek apakah user punya permission Administrator
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: 'Kamu tidak punya izin untuk menjalankan command ini! Hanya admin yang bisa reset achievement.' });
            log('ResetAchievement', `User ${interaction.user.id} tried to reset achievements but lacks Administrator permission`, 'warning');
            return;
        }

        // Ambil target user
        const targetUser = interaction.options.getUser('user');
        if (!targetUser) {
            await interaction.editReply({ content: 'User tidak ditemukan!' });
            log('ResetAchievement', `Target user not found for command by ${interaction.user.id}`, 'error');
            return;
        }

        const userId = targetUser.id;

        // Cek apakah user ada di database
        if (!userData[userId]) {
            await interaction.editReply({ content: 'User tidak ditemukan di database.' });
            log('ResetAchievement', `User ${userId} not found in database for reset by ${interaction.user.id}`, 'error');
            return;
        }

        // Reset achievements
        userData[userId].achievements = [];
        saveData();

        const embed = new EmbedBuilder()
            .setTitle('Achievement Reset')
            .setDescription(`Achievement untuk <@${userId}> telah direset.`)
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        log('ResetAchievement', `Achievements for user ${userId} reset by ${interaction.user.id}`, 'success');
    },
};