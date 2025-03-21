const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { config, saveConfig } = require('../utils/dataManager');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-rules')
        .setDescription('Mengatur pesan rules di channel tertentu.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel tempat pesan rules akan dikirim.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role yang akan diberikan setelah user menerima rules.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (interaction.deferred || interaction.replied) {
            console.log('Interaksi sudah diakui, melanjutkan proses...');
        } else {
            try {
                await interaction.deferReply({ flags: 64 });
                console.log('Defer reply berhasil untuk interaksi:', interaction.id);
            } catch (error) {
                console.error('Gagal defer reply:', error);
                return interaction.followUp({ content: 'Terjadi kesalahan saat memproses permintaan awal.', flags: 64 }).catch(() => {});
            }
        }

        const rulesChannel = interaction.options.getChannel('channel');
        const rulesRole = interaction.options.getRole('role');

        const botMember = interaction.guild.members.me;
        if (!rulesChannel.permissionsFor(botMember).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply({
                content: 'Saya tidak punya izin untuk mengirim pesan atau melihat channel tersebut!'
            });
        }

        const guildId = interaction.guild.id;
        console.log('Guild ID:', guildId);
        if (!config[guildId]) config[guildId] = {};
        config[guildId].rulesChannel = rulesChannel.id;
        config[guildId].rulesRole = rulesRole.id;
        saveConfig();

        const rulesBannerUrl = config.rulesBanner || 'https://s6.gifyu.com/images/bbXrB.md.gif';
        let bannerAttachment;
        try {
            bannerAttachment = new AttachmentBuilder(rulesBannerUrl, { name: 'rules-banner.gif' });
        } catch (error) {
            console.error('Gagal memproses URL GIF:', error.message);
            return interaction.editReply({
                content: 'Gagal memuat banner GIF. Pastikan URL di config.json valid.'
            });
        }

        const rulesPath = 'D:\\Project\\CodeFauzanBot-v1\\botconfig\\rules.json';
        console.log('Rules file path:', rulesPath);
        let rulesData;
        try {
            const rawData = fs.readFileSync(rulesPath, 'utf8');
            console.log('Raw data read:', rawData.substring(0, 100) + '...');
            rulesData = JSON.parse(rawData);
            console.log('Rules data parsed - defaultRules:', rulesData.defaultRules ? 'Exists' : 'Missing');
            console.log('Rules data parsed - guildSpecific:', rulesData.guildSpecific ? 'Exists' : 'Missing');
            console.log('Rules data parsed - guildSpecific[guildId]:', rulesData.guildSpecific ? rulesData.guildSpecific[guildId] : 'N/A');
        } catch (error) {
            console.error('Gagal membaca rules.json:', error.message);
            return interaction.editReply({
                content: 'Terjadi kesalahan saat membaca file rules. Silakan periksa file botconfig/rules.json: ' + error.message
            });
        }

        const guildRules = rulesData.guildSpecific[guildId]?.categories || rulesData.defaultRules.categories;
        if (!guildRules || guildRules.length === 0) {
            console.error('GuildRules kosong atau tidak ditemukan:', guildRules);
            console.error('Debug - rulesData.defaultRules:', rulesData.defaultRules);
            console.error('Debug - rulesData.guildSpecific[guildId]:', rulesData.guildSpecific[guildId]);
            return interaction.editReply({
                content: 'Tidak ada rules yang ditemukan. Pastikan file botconfig/rules.json berisi data kategori yang valid di defaultRules atau guildSpecific.'
            });
        }
        console.log('GuildRules:', guildRules);

        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('📜 Server Rules');

        let totalLength = 0;
        for (const category of guildRules) {
            const title = `🐾 ${category.title}`;
            const content = category.content.replace('{guildName}', interaction.guild.name);
            const fieldLength = title.length + content.length;

            if (totalLength + fieldLength > 6000 || currentEmbed.data.fields?.length >= 25) {
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('📜 Server Rules (Continued)');
                totalLength = 0;
            }

            const truncatedContent = content.length > 1000 ? content.substring(0, 997) + '...' : content;
            currentEmbed.addFields({ name: title, value: truncatedContent });
            totalLength += fieldLength;
            console.log(`Added field: ${title}, Length: ${fieldLength}`);
        }

        if (currentEmbed.data.fields?.length > 0) {
            embeds.push(currentEmbed);
        }
        console.log('Embeds generated:', embeds.length);

        try {
            await rulesChannel.send({ files: [bannerAttachment] });
            console.log('Banner GIF berhasil dikirim');
        } catch (error) {
            console.error('Gagal mengirim banner:', error.message);
            return interaction.editReply({
                content: 'Gagal mengirim banner GIF ke channel.'
            });
        }

        if (embeds.length === 0) {
            console.error('Tidak ada embed untuk dikirim');
            return interaction.editReply({
                content: 'Tidak ada rules untuk dikirim. Periksa file rules.json.'
            });
        }

        for (let i = 0; i < embeds.length; i++) {
            const isLastEmbed = i === embeds.length - 1;
            try {
                await rulesChannel.send({
                    embeds: [embeds[i]],
                    components: isLastEmbed ? [new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('accept_rules')
                            .setLabel('Accept')
                            .setStyle(ButtonStyle.Success)
                    )] : undefined
                });
                console.log(`Embed ${i + 1} berhasil dikirim`);
            } catch (error) {
                console.error(`Gagal mengirim embed ${i + 1}:`, error.message);
                return interaction.editReply({
                    content: `Gagal mengirim salah satu bagian rules: ${error.message}`
                });
            }
        }

        await interaction.editReply({
            content: `Pesan rules berhasil diatur di ${rulesChannel}! Role ${rulesRole} akan diberikan setelah user menekan tombol Accept.`
        });
    },
};