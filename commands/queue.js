const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)),
    async execute(interaction) {
        const queue = getQueue(interaction.guildId);

        if (!queue.nowPlaying && queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
        }

        const page = interaction.options.getInteger('page') || 1;
        const songsPerPage = 10;
        const start = (page - 1) * songsPerPage;
        const end = start + songsPerPage;
        const totalPages = Math.ceil(queue.songs.length / songsPerPage);

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🎵 Music Queue')
            .setTimestamp();

        if (queue.nowPlaying) {
            embed.addFields({
                name: '▶️ Now Playing',
                value: `**[${queue.nowPlaying.title}](${queue.nowPlaying.url})**\nDuration: ${queue.nowPlaying.duration} | Requested by: ${queue.nowPlaying.requester}`,
                inline: false
            });
        }

        if (queue.songs.length > 0) {
            const queueList = queue.songs
                .slice(start, end)
                .map((song, index) => `**${start + index + 1}.** [${song.title}](${song.url})\nDuration: ${song.duration} | Requested by: ${song.requester}`)
                .join('\n\n');

            embed.addFields({
                name: `📃 Up Next (${queue.songs.length} songs)`,
                value: queueList || 'No songs in queue',
                inline: false
            });

            if (totalPages > 1) {
                embed.setFooter({ text: `Page ${page}/${totalPages} | Loop: ${queue.loop}` });
            } else {
                embed.setFooter({ text: `Loop: ${queue.loop}` });
            }
        }

        return interaction.reply({ embeds: [embed] });
    },
};
