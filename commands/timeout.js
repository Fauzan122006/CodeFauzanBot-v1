const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout user (mute sementara)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan di-timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Durasi timeout dalam menit')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)) // Max 28 days
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Alasan timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

        if (!targetUser) {
            await interaction.editReply({ content: '❌ User tidak ditemukan!' });
            return;
        }

        if (targetUser.id === interaction.user.id) {
            await interaction.editReply({ content: '❌ Kamu tidak bisa timeout diri sendiri!' });
            return;
        }

        if (targetUser.id === interaction.client.user.id) {
            await interaction.editReply({ content: '❌ Kamu tidak bisa timeout bot!' });
            return;
        }

        let member;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            await interaction.editReply({ content: '❌ User tidak ada di server!' });
            return;
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            await interaction.editReply({ content: '❌ Kamu tidak bisa timeout user dengan role lebih tinggi atau sama!' });
            return;
        }

        if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            await interaction.editReply({ content: '❌ Bot tidak bisa timeout user dengan role lebih tinggi atau sama!' });
            return;
        }

        const durationMs = duration * 60 * 1000;
        const timeoutEnd = new Date(Date.now() + durationMs);

        // Kirim DM sebelum timeout
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('🔇 Kamu Telah Di-Timeout')
            .setDescription(`Kamu telah di-timeout di **${interaction.guild.name}**`)
            .addFields(
                { name: 'Durasi', value: `${duration} menit`, inline: true },
                { name: 'Berakhir', value: `<t:${Math.floor(timeoutEnd.getTime() / 1000)}:R>`, inline: true },
                { name: 'Alasan', value: reason, inline: false },
                { name: 'Moderator', value: interaction.user.tag, inline: false }
            )
            .setTimestamp();

        await member.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`[Timeout] Could not send DM to ${targetUser.tag}`);
        });

        try {
            await member.timeout(durationMs, `${reason} | Timed out by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ User Berhasil Di-Timeout')
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                    { name: 'Durasi', value: `${duration} menit`, inline: true },
                    { name: 'Berakhir', value: `<t:${Math.floor(timeoutEnd.getTime() / 1000)}:R>`, inline: true },
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
                    .setColor('#FFFF00')
                    .setTitle('🔇 User Timed Out')
                    .addFields(
                        { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Durasi', value: `${duration} menit`, inline: true },
                        { name: 'Alasan', value: reason, inline: false }
                    )
                    .setTimestamp();

                await modLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[Timeout] Error:', error);
            await interaction.editReply({ content: `❌ Gagal timeout user: ${error.message}` });
        }
    },
};
