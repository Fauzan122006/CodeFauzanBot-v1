const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const config = require('../botconfig/config.json');
const userDataPath = './database/userData.json';

// Inisialisasi userData dengan pengecekan lebih aman
let userData = {};
if (fs.existsSync(userDataPath)) {
    const data = fs.readFileSync(userDataPath);
    if (data.length > 0) {
        try {
            userData = JSON.parse(data);
        } catch (e) {
            console.error('Error parsing userData.json:', e);
            userData = {}; // Reset ke kosong kalau JSON rusak
            fs.writeFileSync(userDataPath, '{}'); // Tulis ulang file dengan JSON valid
        }
    }
} else {
    fs.writeFileSync(userDataPath, '{}'); // Buat file baru kalau belum ada
}

// Inisialisasi data user kalau belum ada
function initUser(userId) {
    if (!userData[userId]) {
        userData[userId] = {
            xp: 0,
            level: 1,
            achievements: [],
            voiceTime: 0
        };
        saveData();
    }
}

// Hitung XP yang dibutuhkan untuk naik level
function getRequiredXP(level) {
    return level * 1000;
}

// Hitung rank berdasarkan level (sederhana)
function getRank(level) {
    return Math.floor((level - 1) / 5) * 1000 + 5316;
}

// Cek dan tambah achievement
async function checkAchievements(userId, guild) {
    const user = userData[userId];
    const achievements = user.achievements;

    const achievementChannelId = config.defaultChannels.achievementChannel || guild.channels.cache.find(ch => ch.name === 'levels')?.id;
    const achievementChannel = guild.channels.cache.get(achievementChannelId);

    if (!achievementChannel) return;

    if (user.voiceTime >= 180 && !achievements.includes('stay-awhile-and-listen')) {
        achievements.push('stay-awhile-and-listen');
        const embed = new EmbedBuilder()
            .setTitle('ACHIEVEMENT UNLOCKED!')
            .setDescription(`<@${userId}>, you just unlocked the achievement: **Stay Awhile and Listen**\nSpend 180 minutes in voice channels`)
            .setColor(config.colorthemecode || '#00FF00')
            .setThumbnail(config.achievementImages['stay-awhile-and-listen']);
        await achievementChannel.send({ embeds: [embed] });
        saveData();
    }

    if (user.reactionsGiven >= 100 && !achievements.includes('true-star')) {
        achievements.push('true-star');
        const embed = new EmbedBuilder()
            .setTitle('ACHIEVEMENT UNLOCKED!')
            .setDescription(`<@${userId}>, you just unlocked the achievement: **True Star**\nAdd 100 reactions to messages`)
            .setColor(config.colorthemecode || '#00FF00')
            .setThumbnail(config.achievementImages['true-star']);
        await achievementChannel.send({ embeds: [embed] });
        saveData();
    }
}

// Simpan data ke file JSON
function saveData() {
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
}

module.exports = {
    initUser,
    getRequiredXP,
    getRank,
    checkAchievements,
    userData,
    saveData
};