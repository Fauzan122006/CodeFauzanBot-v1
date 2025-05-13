const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { serverList, saveServerList } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-rules')
        .setDescription('Set the rules message for the server.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the rules message.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role1')
                .setDescription('The first role to give after accepting rules.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rules')
                .setDescription('The rules as text (e.g., "Rule 1: Be nice 😊\\nRule 2: No spamming 🚫")')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role2')
                .setDescription('The second role to give after accepting rules (optional).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL of an image to display in the rules embed (optional).')
                .setRequired(false))
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
        const rulesRole1 = interaction.options.getRole('role1');
        const rulesRole2 = interaction.options.getRole('role2');
        const rulesInput = interaction.options.getString('rules');
        const imageUrl = interaction.options.getString('image');

        if (!rulesChannel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply({ content: 'I don\'t have permission to send messages or view that channel!' });
        }

        if (imageUrl) {
            const urlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
            if (!urlPattern.test(imageUrl)) {
                return interaction.editReply({ content: 'URL gambar tidak valid! Pastikan URL mengarah ke gambar (png, jpg, jpeg, gif, atau webp).' });
            }
        }

        const guildRules = [];
        const ruleLines = rulesInput.split('\n');

        for (const line of ruleLines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const [title, ...contentParts] = trimmedLine.split(':');
            if (!title || !contentParts.length) {
                return interaction.editReply({ content: 'Format aturan salah! Gunakan format "Rule 1: Isi aturan" untuk setiap baris.' });
            }

            const content = contentParts.join(':').trim();
            if (!content) {
                return interaction.editReply({ content: `Aturan "${title}" tidak boleh kosong!` });
            }

            guildRules.push({
                title: title.trim(),
                content: content
            });
        }

        if (guildRules.length === 0) {
            return interaction.editReply({ content: 'Kamu harus memasukkan setidaknya satu aturan!' });
        }

        const guildId = interaction.guild.id;
        if (!serverList[guildId]) serverList[guildId] = {};
        serverList[guildId].rules = {
            enabled: true,
            channel: rulesChannel.id,
            rules: guildRules,
            image: imageUrl || '',
            role1: rulesRole1.id,
            role2: rulesRole2 ? rulesRole2.id : null
        };
        saveServerList();

        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('📜 Server Rules');

        if (imageUrl) {
            currentEmbed.setImage(imageUrl);
        }

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
        }

        if (currentEmbed.data.fields?.length > 0) {
            embeds.push(currentEmbed);
        }

        for (let i = 0; i < embeds.length; i++) {
            const isLastEmbed = i === embeds.length - 1;
            await rulesChannel.send({
                embeds: [embeds[i]],
                components: isLastEmbed ? [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('accept_rules')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success)
                )] : undefined
            });
        }

        const roleMessage = rulesRole2 
            ? `Role ${rulesRole1} and ${rulesRole2} will be given after users press Accept.`
            : `Role ${rulesRole1} will be given after users press Accept.`;
        await interaction.editReply({ content: `Rules message set in ${rulesChannel}! ${roleMessage}` });
    },
};