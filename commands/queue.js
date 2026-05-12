const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)),
    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
        }

        const requestedPage = interaction.options.getInteger('page') || 1;
        const songsPerPage = 10;
        const totalPages = Math.max(1, Math.ceil((queue.songs.length - 1) / songsPerPage));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const start = (page - 1) * songsPerPage;
        const end = start + songsPerPage;

        const currentSong = queue.songs[0];
        const upNext = queue.songs.slice(start + 1, end + 1);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 Music Queue')
            .setThumbnail(currentSong.thumbnail)
            .setTimestamp();

        embed.addFields({
            name: '🎵 Now Playing',
            value: `**[${currentSong.name}](${currentSong.url})**\n⏱️ ${currentSong.formattedDuration} | 🎤 ${currentSong.user}`,
            inline: false
        });

        if (upNext.length > 0) {
            const queueList = upNext
                .map((song, index) => `**${start + index + 1}.** [${song.name}](${song.url}) - \`${song.formattedDuration}\``)
                .join('\n');

            embed.addFields({
                name: `📃 Up Next (${queue.songs.length - 1} song${queue.songs.length > 2 ? 's' : ''})`,
                value: queueList,
                inline: false
            });
        }

        // Add queue stats
        const loopMode = queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Song' : 'Queue';
        const estimatedQueueDuration = queue.songs
            .slice(1)
            .reduce((total, song) => total + (song.duration || 0), 0);
        const queueHours = Math.floor(estimatedQueueDuration / 3600);
        const queueMinutes = Math.floor((estimatedQueueDuration % 3600) / 60);
        const queueSeconds = estimatedQueueDuration % 60;
        const stats = [
            `🔊 Volume: ${queue.volume}%`,
            `🔁 Loop: ${loopMode}`,
            `🔄 AutoPlay: ${queue.autoplay ? 'On' : 'Off'}`,
            `⏸️ Status: ${queue.paused ? 'Paused' : 'Playing'}`,
            `🕒 Sisa queue: ${queueHours > 0 ? `${queueHours}h ` : ''}${queueMinutes}m ${queueSeconds}s`
        ].join(' | ');

        embed.addFields({
            name: '📊 Queue Stats',
            value: stats,
            inline: false
        });

        if (totalPages > 1) {
            embed.setFooter({ text: `Page ${page}/${totalPages}${requestedPage !== page ? ` (requested ${requestedPage})` : ''}` });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
