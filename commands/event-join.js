const { SlashCommandBuilder } = require('discord.js');
const { userData, saveData } = require('../utils/functions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event-join')
        .setDescription('Join an event to earn achievements!'),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const userId = interaction.user.id;
        if (!userData[userId]) userData[userId] = {};
        userData[userId].eventCount = (userData[userId].eventCount || 0) + 1;
        saveData();
        await interaction.editReply({ content: 'You joined an event! Check your achievements!' });
    },
};