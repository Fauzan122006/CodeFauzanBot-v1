const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Buat polling untuk server')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Pertanyaan poll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('Pilihan 1')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Pilihan 2')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Pilihan 3 (opsional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Pilihan 4 (opsional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Durasi poll dalam menit (default: tanpa batas)')
                .setMinValue(1)
                .setMaxValue(10080) // Max 1 week
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const question = interaction.options.getString('question');
        const option1 = interaction.options.getString('option1');
        const option2 = interaction.options.getString('option2');
        const option3 = interaction.options.getString('option3');
        const option4 = interaction.options.getString('option4');
        const duration = interaction.options.getInteger('duration');

        const options = [option1, option2, option3, option4].filter(opt => opt !== null);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        const optionsText = options.map((opt, index) => 
            `${emojis[index]} ${opt}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📊 ' + question)
            .setDescription(optionsText)
            .setFooter({ text: `Poll dibuat oleh ${interaction.user.username}` })
            .setTimestamp();

        if (duration) {
            const endTime = Math.floor((Date.now() + (duration * 60 * 1000)) / 1000);
            embed.addFields({
                name: '⏰ Berakhir',
                value: `<t:${endTime}:R>`,
                inline: false
            });
        }

        // Kirim poll
        const pollMessage = await interaction.channel.send({ embeds: [embed] });

        // Tambah reaksi
        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(emojis[i]);
        }

        await interaction.editReply({ 
            content: '✅ Poll berhasil dibuat!', 
            ephemeral: true 
        });

        // Auto close poll jika ada durasi
        if (duration) {
            setTimeout(async () => {
                try {
                    const updatedMessage = await pollMessage.fetch();
                    const reactions = updatedMessage.reactions.cache;

                    let results = '';
                    let maxVotes = 0;
                    let winners = [];

                    for (let i = 0; i < options.length; i++) {
                        const reaction = reactions.get(emojis[i]);
                        const count = reaction ? reaction.count - 1 : 0; // -1 untuk bot reaction
                        
                        results += `${emojis[i]} ${options[i]}: **${count}** votes\n`;

                        if (count > maxVotes) {
                            maxVotes = count;
                            winners = [options[i]];
                        } else if (count === maxVotes && count > 0) {
                            winners.push(options[i]);
                        }
                    }

                    const resultEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('📊 Poll Selesai: ' + question)
                        .setDescription(results)
                        .addFields({
                            name: '🏆 Pemenang',
                            value: winners.length > 0 ? winners.join(', ') : 'Tidak ada vote',
                            inline: false
                        })
                        .setFooter({ text: `Poll dibuat oleh ${interaction.user.username}` })
                        .setTimestamp();

                    await updatedMessage.edit({ embeds: [resultEmbed] });
                    await updatedMessage.reactions.removeAll();
                } catch (error) {
                    console.error('[Poll] Error closing poll:', error);
                }
            }, duration * 60 * 1000);
        }
    },
};
