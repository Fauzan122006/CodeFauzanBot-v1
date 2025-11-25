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

        const page = interaction.options.getInteger('page') || 1;
        const songsPerPage = 10;
        const start = (page - 1) * songsPerPage;
        const end = start + songsPerPage;
        const totalPages = Math.ceil(queue.songs.length / songsPerPage);

        const currentSong = queue.songs[0];
        const upNext = queue.songs.slice(start + 1, end + 1);

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🎵 Music Queue')
            .setTimestamp();

        embed.addFields({
            name: '▶️ Now Playing',
            value: `**[${currentSong.name}](${currentSong.url})**\nDuration: ${currentSong.formattedDuration} | Requested by: ${currentSong.user.tag}`,
            inline: false
        });

        if (upNext.length > 0) {
            const queueList = upNext
                .map((song, index) => `**${start + index + 1}.** [${song.name}](${song.url})\nDuration: ${song.formattedDuration} | Requested by: ${song.user.tag}`)
                .join('\n\n');

            embed.addFields({
                name: `📃 Up Next (${queue.songs.length - 1} songs)`,
                value: queueList,
                inline: false
            });
        }

        if (totalPages > 1) {
            embed.setFooter({ text: `Page ${page}/${totalPages} | Loop: ${queue.repeatMode ? 'Enabled' : 'Disabled'} | Autoplay: ${queue.autoplay ? 'On' : 'Off'}` });
        } else {
            embed.setFooter({ text: `Loop: ${queue.repeatMode ? 'Enabled' : 'Disabled'} | Autoplay: ${queue.autoplay ? 'On' : 'Off'}` });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
