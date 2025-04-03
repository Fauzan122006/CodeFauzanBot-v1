const express = require('express');
const { config, roleList, rules, saveConfig, saveRoleList, saveRules } = require('./utils/dataManager');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index', { config, roleList, rules });
});

app.post('/update-config', (req, res) => {
    const { guildId, welcomeChannel, levelChannel, achievementChannel, rolesChannel, rulesChannel, socialChannel, youtubeChannelId } = req.body;
    if (!config[guildId]) config[guildId] = {};
    config[guildId].welcomeChannel = welcomeChannel;
    config[guildId].levelChannel = levelChannel;
    config[guildId].achievementChannel = achievementChannel;
    config[guildId].rolesChannel = rolesChannel;
    config[guildId].rulesChannel = rulesChannel;
    config[guildId].socialChannel = socialChannel;
    config[guildId].youtubeChannelId = youtubeChannelId;
    saveConfig();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('Dashboard running on http://localhost:3000');
});