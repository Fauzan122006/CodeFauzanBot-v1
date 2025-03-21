const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post-social')
        .setDescription('Post a social media update (YouTube or Instagram).')
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Platform to post from (youtube/instagram)')
                .setRequired(true)
                .addChoices(
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'Instagram', value: 'instagram' }
                ))
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Link to the post/video')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // Ganti ephemeral: true jadi flags: 64

        const platform = interaction.options.getString('platform');
        const link = interaction.options.getString('link');
        const guildId = interaction.guild.id;
        const socialChannelId = config[guildId]?.socialChannel;

        if (!socialChannelId) {
            return interaction.editReply({ content: 'Social media channel not set! Use /set-social to configure it.' });
        }

        const channel = interaction.guild.channels.cache.get(socialChannelId);
        if (!channel) {
            return interaction.editReply({ content: 'Social media channel not found!' });
        }

        if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
            return interaction.editReply({ content: 'Bot doesn\'t have permission to send messages or embed links in the social channel!' });
        }

        let embed;
        if (platform === 'youtube') {
            embed = new EmbedBuilder()
                .setTitle('🎥 New YouTube Video!')
                .setDescription(`Hey @everyone, a new video just posted! Go check it out!\n\n${link}`)
                .setColor('#00BFFF')
                .setTimestamp();
        } else if (platform === 'instagram') {
            embed = new EmbedBuilder()
                .setTitle('📸 New Instagram Post!')
                .setDescription(`Hey @everyone, a new post just dropped! Check it out!\n\n${link}`)
                .setColor('#00BFFF')
                .setTimestamp()
                .setURL(link); // Tambah URL biar Discord coba ambil metadata
        }

        try { 
            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: 'Post sent successfully!' });
        } catch (error) {
            console.error('Error sending social post:', error);
            await interaction.editReply({ content: 'Failed to send post. Check bot permissions!' });
        }
    },
};