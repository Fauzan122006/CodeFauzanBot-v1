const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');
const { fetchTargetMember, canModerate, buildCooldownGuard } = require('../utils/commandGuards');
const { addModerationAction, getRecentWarnCount } = require('../utils/moderationManager');
const { createLogger } = require('../utils/logger');

const log = createLogger('WarnCommand');
const moderationCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Beri peringatan kepada pengguna.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Pengguna yang akan diberi peringatan.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Alasan peringatan.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        if (!targetUser) {
            await interaction.editReply({ content: 'Pengguna tidak ditemukan! Pastikan pengguna yang dipilih valid.' });
            return;
        }

        const member = await fetchTargetMember(interaction, targetUser);
        if (!member) {
            await interaction.editReply({ content: 'Pengguna tidak ditemukan di server ini!' });
            return;
        }
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

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Kamu Mendapat Peringatan')
            .setDescription(`**Alasan:** ${reason}\n**Diberikan oleh:** ${interaction.user}`)
            .setColor(config.colorthemecode || '#FF0000')
            .setTimestamp();

        await member.send({ embeds: [embed] }).catch(() => {
            interaction.followUp({ content: 'Tidak dapat mengirim DM ke pengguna.', ephemeral: true });
        });

        addModerationAction({
            guildId: interaction.guildId,
            userId: targetUser.id,
            moderatorId: interaction.user.id,
            action: 'warn',
            reason
        });

        const warnCount = getRecentWarnCount(interaction.guildId, targetUser.id);
        let escalationMessage = '';

        if (warnCount >= 5) {
            try {
                await member.kick(`Auto-escalation after ${warnCount} warnings | ${reason}`);
                addModerationAction({
                    guildId: interaction.guildId,
                    userId: targetUser.id,
                    moderatorId: interaction.user.id,
                    action: 'auto_kick',
                    reason: `Auto escalation after ${warnCount} warnings`
                });
                escalationMessage = '\n🚨 Auto escalation: user otomatis di-kick (>=5 warning).';
            } catch (error) {
                escalationMessage = `\n⚠️ Auto escalation kick gagal: ${error.message}`;
                log.error('Auto-kick escalation failed', { guildId: interaction.guildId, userId: targetUser.id, error: error.message });
            }
        } else if (warnCount >= 3) {
            try {
                const timeoutMs = 15 * 60 * 1000;
                await member.timeout(timeoutMs, `Auto-escalation after ${warnCount} warnings | ${reason}`);
                addModerationAction({
                    guildId: interaction.guildId,
                    userId: targetUser.id,
                    moderatorId: interaction.user.id,
                    action: 'auto_timeout',
                    reason: `Auto escalation after ${warnCount} warnings`
                });
                escalationMessage = '\n⚠️ Auto escalation: user otomatis timeout 15 menit (>=3 warning).';
            } catch (error) {
                escalationMessage = `\n⚠️ Auto escalation timeout gagal: ${error.message}`;
                log.error('Auto-timeout escalation failed', { guildId: interaction.guildId, userId: targetUser.id, error: error.message });
            }
        }

        await interaction.editReply({
            content: `${targetUser} telah diberi peringatan dengan alasan: ${reason}\nTotal warning (7 hari): ${warnCount}${escalationMessage}`
        });
    },
};
