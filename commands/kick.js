const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { fetchTargetMember, canModerate, buildCooldownGuard } = require('../utils/commandGuards');
const { addModerationAction } = require('../utils/moderationManager');

const moderationCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick user dari server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan di-kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Alasan kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

        if (!targetUser) {
            await interaction.editReply({ content: '❌ User tidak ditemukan!' });
            return;
        }

        const member = await fetchTargetMember(interaction, targetUser);
        const guard = canModerate(interaction, member);
        if (!guard.ok) {
            await interaction.editReply({ content: guard.message });
            return;
        }

        const cooldown = buildCooldownGuard(
            moderationCooldowns,
            `${interaction.guildId}:${targetUser.id}`,
            10_000
        );
        if (!cooldown.ok) {
            await interaction.editReply({ content: cooldown.message });
            return;
        }

        // Kirim DM sebelum kick
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('👢 Kamu Telah Di-Kick')
            .setDescription(`Kamu telah di-kick dari **${interaction.guild.name}**`)
            .addFields(
                { name: 'Alasan', value: reason, inline: false },
                { name: 'Moderator', value: interaction.user.tag, inline: false }
            )
            .setTimestamp();

        await member.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`[Kick] Could not send DM to ${targetUser.tag}`);
        });

        try {
            await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);
            addModerationAction({
                guildId: interaction.guildId,
                userId: targetUser.id,
                moderatorId: interaction.user.id,
                action: 'kick',
                reason
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ User Berhasil Di-Kick')
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Alasan', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Log ke moderation channel
            const modLogChannel = interaction.guild.channels.cache.find(
                ch => ch.name === 'mod-logs' || ch.name === 'moderation-logs'
            );

            if (modLogChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('👢 User Kicked')
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Alasan', value: reason, inline: false }
                    )
                    .setTimestamp();

                await modLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[Kick] Error:', error);
            await interaction.editReply({ content: `❌ Gagal kick user: ${error.message}` });
        }
    },
};
