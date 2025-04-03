const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');
const roleList = require('../botconfig/roleList.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get-roles')
        .setDescription('Kirim embed peran ke channel yang ditentukan')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const guildId = interaction.guildId;
        const serverConfig = config[guildId] || {};
        const rolesChannelId = serverConfig.rolesChannel || config.defaultChannels?.rolesChannel || interaction.guild.channels.cache.find(ch => ch.name === 'get-role')?.id;

        console.log(`[Get-Roles] Mencoba mengambil channel dengan ID: ${rolesChannelId}`);

        // Coba ambil channel dari cache, kalau ga ada, fetch
        let rolesChannel = interaction.guild.channels.cache.get(rolesChannelId);
        if (!rolesChannel) {
            try {
                rolesChannel = await interaction.guild.channels.fetch(rolesChannelId);
                console.log(`[Get-Roles] Berhasil fetch channel: ${rolesChannel?.id}`);
            } catch (error) {
                console.log(`[Get-Roles] Gagal fetch channel ${rolesChannelId}: ${error.message}`);
                await interaction.editReply({ content: 'Channel peran tidak ditemukan! Silakan atur ulang dengan /set-roles.', flags: 64 });
                return;
            }
        }

        if (!rolesChannel) {
            console.log(`[Get-Roles] Channel ${rolesChannelId} tidak ditemukan setelah fetch`);
            await interaction.editReply({ content: 'Channel peran tidak ditemukan! Silakan atur ulang dengan /set-roles.', flags: 64 });
            return;
        }

        // Cek izin bot di channel
        if (!rolesChannel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
            console.log(`[Get-Roles] Bot tidak punya izin di channel ${rolesChannelId}`);
            await interaction.editReply({ content: 'Bot tidak memiliki izin untuk mengirim pesan atau embed di channel peran! Pastikan bot punya izin SendMessages, ViewChannel, dan EmbedLinks.', flags: 64 });
            return;
        }

        // Ambil roles dari roleList.guilds (sesuai struktur roleList.json)
        const roles = roleList.guilds && roleList.guilds[guildId] ? roleList.guilds[guildId] : [];
        if (!roles || roles.length === 0) {
            console.log(`[Get-Roles] Tidak ada role untuk guild ${guildId} di roleList.json`);
            await interaction.editReply({ content: 'Tidak ada peran yang ditemukan untuk server ini! Tambahkan peran dengan /add-role.', flags: 64 });
            return;
        }

        // Kelompokkan roles berdasarkan kategori
        const rolesByCategory = {};
        roles.forEach(role => {
            if (!rolesByCategory[role.category]) {
                rolesByCategory[role.category] = [];
            }
            rolesByCategory[role.category].push(role);
        });

        console.log(`[Get-Roles] Jumlah kategori role: ${Object.keys(rolesByCategory).length}`);

        // Kirim embed untuk setiap kategori
        const messages = [];
        for (const [category, roles] of Object.entries(rolesByCategory)) {
            const rolesText = roles.map(role => `${role.emoji} ${role.name}`).join('\n');
            const embed = new EmbedBuilder()
                .setTitle(category)
                .setDescription(`Silahkan pilih peran sesuai dengan keinginan kamu untuk mengakses channel yang tersedia dibawah sini!\n\n${rolesText}`)
                .setColor(config.colorthemecode || '#00BFFF');

            // Set image kalau ada, dengan pengecekan
            const categoryImage = config.categoryImages && config.categoryImages[category] ? config.categoryImages[category] : config.rolesImage || '';
            if (categoryImage) {
                embed.setImage(categoryImage);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select-role-${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`)
                .setPlaceholder(`Pilih peran dari ${category}...`)
                .addOptions(
                    roles.map(role => ({
                        label: role.name,
                        value: role.name,
                        emoji: role.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            try {
                const message = await rolesChannel.send({ embeds: [embed], components: [row] });
                messages.push(message);
                console.log(`[Get-Roles] Berhasil kirim embed untuk kategori ${category}`);
            } catch (error) {
                console.log(`[Get-Roles] Gagal kirim embed untuk kategori ${category}: ${error.message}`);
                await interaction.editReply({ content: `Gagal mengirim embed untuk kategori ${category}! Pastikan bot punya izin atau cek log untuk detail.`, flags: 64 });
                return;
            }
        }

        await interaction.editReply({ content: `Embed peran telah dikirim ke ${rolesChannel}!`, flags: 64 });
    },
};