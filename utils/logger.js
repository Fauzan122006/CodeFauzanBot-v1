function serializeMeta(meta) {
    if (!meta) return '';
    try {
        return ` ${JSON.stringify(meta)}`;
    } catch (error) {
        return ` {"metaError":"${error.message}"}`;
    }
}

function log(level, moduleName, message, meta) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${moduleName}] [${level.toUpperCase()}] ${message}${serializeMeta(meta)}`;
    if (level === 'error') {
        console.error(line);
        return;
    }
    console.log(line);
}

function createLogger(moduleName) {
    return {
        info(message, meta) {
            log('info', moduleName, message, meta);
        },
        success(message, meta) {
            log('success', moduleName, message, meta);
        },
        warning(message, meta) {
            log('warning', moduleName, message, meta);
        },
        error(message, meta) {
            log('error', moduleName, message, meta);
        }
    };
}

module.exports = { createLogger };
