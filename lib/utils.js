const path = require('node:path');
const colors = require('./colors');

const SENSITIVES_FILES = ['.env', '.git'];

function setTextColor(filename, stat) {
    if (stat.isDirectory()) {
        return colors.BLUE;
    }
    if (stat.isSymbolicLink()) {
        return colors.CYAN;
    }

    const ext = path.extname(filename).toLocaleLowerCase();

    if (SENSITIVES_FILES.includes(filename) || SENSITIVES_FILES.includes(path.basename(filename))) {
        return colors.RED;
    }

    if (ext === '.json') {

        return colors.YELLOW;

    }
    return colors.RESET;
}


function stripAINSIColor(line) {
    return line.replace(/\x1B\[\d+m/g, '');
}


function checkFileType(stat) {
    let type;
    if (stat.isDirectory()) {
        type = 'dir';
    } else if (stat.isSymbolicLink()) {
        type = 'slink';
    } else {
        type = 'file';
    }
    return type;
}

function validateOptions(options,allowedKeys) {
    if (typeof options !== 'object') throw new TypeError(`${options} must be an object`);
    for (const key of Object.keys(options)) {
        if (!allowedKeys.includes(key)) {
            throw new Error(`Invalid options key: ${key}`)
        }
    }
}

module.exports = { setTextColor, stripAINSIColor, checkFileType,validateOptions };
