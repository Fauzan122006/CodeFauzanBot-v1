const chalk = require('chalk');

const log = (module, message, level = 'info') => {
    const timestamp = new Date().toISOString();
    let coloredMessage;

    switch (level.toLowerCase()) {
        case 'success':
            coloredMessage = chalk.cyan(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'error':
            coloredMessage = chalk.red(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'warning':
            coloredMessage = chalk.yellow(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'info':
        default:
            coloredMessage = chalk.white(`[${timestamp}] [${module}] ${message}`);
            break;
    }

    console.log(coloredMessage);
};

function ensureAuthenticated(req, res, next) {
    log('Auth', `Checking authentication for user: ${req.user ? req.user.id : 'undefined'}`);
    if (req.isAuthenticated()) {
        log('Auth', 'User is authenticated');
        return next();
    }
    log('Auth', 'User is not authenticated, redirecting to /auth/discord');
    res.redirect('/auth/discord');
}

function ensureAdmin(req, res, next) {
    const guildId = req.params.guildId;
    const guild = req.client.guilds.cache.get(guildId);
    if (!guild) {
        log('Admin', `Guild ${guildId} not found`, 'error');
        return res.status(404).send('Server tidak ditemukan.');
    }

    if (!req.user) {
        log('Admin', 'req.user is undefined in ensureAdmin', 'error');
        return res.redirect('/auth/discord');
    }

    // Gunakan permissions dari req.user.guilds
    const userGuild = req.user.guilds?.find(g => g.id === guildId);
    if (!userGuild) {
        log('Admin', `User ${req.user.id} is not a member of guild ${guildId}`, 'error');
        return res.status(403).send('Kamu tidak menjadi anggota server ini.');
    }

    // Cek izin Administrator menggunakan bitwise
    const permissions = parseInt(userGuild.permissions);
    const hasAdmin = (permissions & 0x8) === 0x8; // 0x8 adalah bit untuk Administrator
    
    if (!hasAdmin) {
        log('Admin', `User ${req.user.id} does not have Administrator permissions in guild ${guildId}`, 'error');
        return res.status(403).send('Kamu harus menjadi Administrator untuk mengatur server ini.');
    }

    req.guild = guild;
    next();
}

module.exports = { ensureAuthenticated, ensureAdmin };