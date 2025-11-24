const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

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

        if (targetUser.id === interaction.user.id) {
            await interaction.editReply({ content: '❌ Kamu tidak bisa kick diri sendiri!' });
            return;
        }

        if (targetUser.id === interaction.client.user.id) {
            await interaction.editReply({ content: '❌ Kamu tidak bisa kick bot!' });
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
            await interaction.editReply({ content: '❌ Kamu tidak bisa kick user dengan role lebih tinggi atau sama!' });
            return;
        }

        if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            await interaction.editReply({ content: '❌ Bot tidak bisa kick user dengan role lebih tinggi atau sama!' });
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
