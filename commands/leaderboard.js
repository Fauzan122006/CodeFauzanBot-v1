const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userData } = require('../utils/userDataHandler');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Cek siapa yang paling top di server ini! 🔥'),
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guildId;
        const users = Object.entries(userData)
            .filter(([id, data]) => data.guilds && data.guilds[guildId])
            .map(([id, data]) => ({ id, xp: data.guilds[guildId].xp || 0, level: data.guilds[guildId].level || 1 }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 10 Player Paling Top! 🔥') // Judul lebih simpel dan natural
            .setColor(config.colorthemecode || '#00BFFF')
            .setTimestamp();

        if (users.length === 0) {
            embed.setDescription('Belum ada yang masuk top 10 nih, ayo grind biar masuk! 💪');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            let displayName = 'User Ga Ketemu :(';

            try {
                const member = await interaction.guild.members.fetch(user.id);
                displayName = member.displayName || member.user.username; // Ambil displayName atau username
            } catch (error) {
                console.log(`[Leaderboard] Gagal ambil data user ${user.id}: ${error.message}`);
            }

            embed.addFields({
                name: `#${index + 1} ${displayName} ${index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}`,
                value: `Level: ${user.level} (Sultan abis! 🤑) | XP: ${user.xp} (Gila sih ini! 😱)`,
                inline: false
            });
        }

        embed.setFooter({ text: 'Grind terus biar masuk top 10, bro! 💥' });

        await interaction.editReply({ embeds: [embed] });
    },
};