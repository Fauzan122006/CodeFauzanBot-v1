const { checkAchievements, userData } = require('./functions');

async function handleAchievements(userId, guild, type) {
    const user = userData[userId];
    console.log(`[AchievementHandler] Checking achievements for user ${userId} (type: ${type})`);
    console.log(`[AchievementHandler] Current achievements for user ${userId}: ${user.achievements || 'none'}`);

    await checkAchievements(userId, guild);

    console.log(`[AchievementHandler] Updated achievements for user ${userId}: ${userData[userId].achievements}`);
    // saveData(); // Hapus, biar saveData dipanggil di caller
    console.log(`[AchievementHandler] Data saved for user ${userId}`);
}

module.exports = { handleAchievements };