const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');
const { fetchTargetMember, canModerate, buildCooldownGuard } = require('../utils/commandGuards');
const { addModerationAction } = require('../utils/moderationManager');

const moderationCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban user dari server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan di-ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Alasan ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('deletedays')
                .setDescription('Hapus pesan user dalam berapa hari (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
        const deleteDays = interaction.options.getInteger('deletedays') || 0;

        if (!targetUser) {
            await interaction.editReply({ content: '❌ User tidak ditemukan!' });
            return;
        }

        const member = await fetchTargetMember(interaction, targetUser);
        if (member) {
            const guard = canModerate(interaction, member);
            if (!guard.ok) {
                await interaction.editReply({ content: guard.message });
                return;
            }

            // Coba kirim DM sebelum ban
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ Kamu Telah Di-Ban')
                .setDescription(`Kamu telah di-ban dari **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Alasan', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: false }
                )
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] }).catch(() => {
                console.log(`[Ban] Could not send DM to ${targetUser.tag}`);
            });
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

        // Ban user
        try {
            await interaction.guild.members.ban(targetUser.id, {
                reason: `${reason} | Banned by ${interaction.user.tag}`,
                deleteMessageSeconds: deleteDays * 24 * 60 * 60
            });
            addModerationAction({
                guildId: interaction.guildId,
                userId: targetUser.id,
                moderatorId: interaction.user.id,
                action: 'ban',
                reason
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ User Berhasil Di-Ban')
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Alasan', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: false },
                    { name: 'Pesan Terhapus', value: `${deleteDays} hari`, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Log ke moderation channel jika ada
            const modLogChannel = interaction.guild.channels.cache.find(
                ch => ch.name === 'mod-logs' || ch.name === 'moderation-logs'
            );

            if (modLogChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔨 User Banned')
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Alasan', value: reason, inline: false }
                    )
                    .setTimestamp();

                await modLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[Ban] Error:', error);
            await interaction.editReply({ content: `❌ Gagal ban user: ${error.message}` });
        }
    },
};
