const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Hapus pesan dalam channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Jumlah pesan yang akan dihapus (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Hapus pesan dari user tertentu (opsional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        try {
            let fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });

            // Filter pesan jika user tertentu
            if (targetUser) {
                fetchedMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
            }

            // Ambil sejumlah amount pesan
            const messagesToDelete = fetchedMessages.first(amount);

            // Filter pesan yang lebih dari 14 hari (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

            if (recentMessages.length === 0) {
                await interaction.editReply({ content: '❌ Tidak ada pesan yang bisa dihapus (semua pesan lebih dari 14 hari)!' });
                return;
            }

            // Hapus pesan
            const deleted = await interaction.channel.bulkDelete(recentMessages, true);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Pesan Berhasil Dihapus')
                .setDescription(`Berhasil menghapus **${deleted.size}** pesan${targetUser ? ` dari ${targetUser.tag}` : ''}`)
                .addFields(
                    { name: 'Channel', value: interaction.channel.name, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Log ke moderation channel
            const modLogChannel = interaction.guild.channels.cache.find(
                ch => ch.name === 'mod-logs' || ch.name === 'moderation-logs'
            );

            if (modLogChannel && modLogChannel.id !== interaction.channel.id) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('🗑️ Messages Cleared')
                    .addFields(
                        { name: 'Channel', value: `${interaction.channel.name} (${interaction.channel.id})`, inline: false },
                        { name: 'Amount', value: `${deleted.size} pesan`, inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Target User', value: targetUser ? targetUser.tag : 'Semua user', inline: true }
                    )
                    .setTimestamp();

                await modLogChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[Clear] Error:', error);
            await interaction.editReply({ content: `❌ Gagal hapus pesan: ${error.message}` });
        }
    },
};
