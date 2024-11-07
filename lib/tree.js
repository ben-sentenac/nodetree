const fs = require('fs').promises;
const path = require('path');
const { readdirSync, lstatSync, statSync, readFileSync } = require('fs');
const { checkFileType, setTextColor, stripAINSIColor,validateOptions } = require('./utils');
const colors = require('./colors');
const { getGitStatus, setGitIndicator } = require('./git');

const allowedKeys = ['ignoreNodeModules', 'objectMode', 'indent', 'gitStatus'];


async function writeToFile(sourceDir, output = 'output.log') {
    const fileHandle = await fs.open(output, 'w');
    const writeStream = fileHandle.createWriteStream();
    writeStream.write(`Directory structure from ${sourceDir}:\n\n`);
    for await (const line of treeGenerator(sourceDir)) {
        const _line = stripAINSIColor(line);
        writeStream.write(_line + '\n');
    }
    writeStream.on('error', (error) => {
        console.error(error);
    });
    writeStream.end(() => console.log(`File tree successfully written to ${path.resolve(output)}`));
}


//TODO add git status 
async function* treeObjectGenerator(dir, opts) {
    let files;
    const { ignoreNodeModules, gitStatus } = opts;
    try {
        files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            const relativePath = fullPath.replace(`${process.cwd()}/`, '');
            //ignore node_modules
            if (ignoreNodeModules && file.name === 'node_modules') {
                continue;
            }

            let gitIndicator = '';
            if (gitStatus?.untracked.includes(relativePath)) {
                gitIndicator = 'Untracked file';
            }
            const stat = file.isSymbolicLink() ? await fs.lstat(fullPath) : await fs.stat(fullPath);
            const node = {
                type: checkFileType(stat),
                mtime: stat.mtime,
                name: file.name,
                path: fullPath,
                size: stat.size,
                gitStatus: gitIndicator || null
            }

            if (stat.isDirectory()) {
                node.children = [];
                for await (const child of treeObjectGenerator(fullPath, { ignoreNodeModules, gitStatus })) {
                    node.children.push(child)
                }
                // Update and freeze node with children before yielding
                yield Object.freeze(node);
            } else {
                // Yield regular file node
                yield Object.freeze(node);
            }

        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }

}

function treeObjectRecursive(dir, opts) {
    let files;
    let tree = [];
    const { ignoreNodeModules, gitStatus } = opts;
    files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = fullPath.replace(`${process.cwd()}/`, '');
        //ignore node_modules
        if (ignoreNodeModules && file.name === 'node_modules') {
            continue;
        }

        let gitIndicator = '';
        if (gitStatus?.untracked.includes(relativePath)) {
            gitIndicator = 'Untracked file';
        }
        const stat = file.isSymbolicLink() ? lstatSync(fullPath) : statSync(fullPath);
        const node = {
            type: checkFileType(stat),
            mtime: stat.mtime,
            name: file.name,
            path: fullPath,
            size: stat.size,
            gitStatus: gitIndicator || null
        }

        if (stat.isDirectory()) {
            node.children = [];
            node.children.push(node);
            Object.freeze(node);
            tree.push(node);
            treeObjectRecursive(fullPath, { ignoreNodeModules, gitStatus });
            // Update and freeze node with children before yielding

        } else {
            Object.freeze(node);
            tree.push(node);
        }
    }
    return tree;
}

function treeRecursive(dir, options = {}) {

    if (typeof options !== 'object') {
        throw Error('options param must be an object');
    }
    let files;
    const defaultOptions = {
        indent: ' '.repeat(4),
        ignoreNodeModules: true,
        ignore: [],
        ignoreFileRead: false,
    };
    const _options = { ...defaultOptions, ...options };
    if (!_options.ignoreFileRead) {
        const ignoreFilePath = path.join(dir, '.ignore');
        try {
            const ignoreContent = readFileSync(ignoreFilePath, { encoding: 'utf-8' });
            _options.ignore = ignoreContent.split('\n').filter(Boolean);//cache if meet the .ignore file in sub dir 
            _options.ignoreFileRead = true;//flag to avoid reading `.ignore` again
        } catch (error) {
            //ignore error if .ignore doesn't exists
        }
    }
    try {
        files = readdirSync(dir, { withFileTypes: true });
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.name;
            const fullPath = path.join(dir, filename);
            const isLast = i === files.length - 1;
            const prefix = isLast ? '└── ' + colors.RESET : '├── ' + colors.RESET;

            if (_options.ignoreNodeModules && filename === 'node_modules' || filename === '.git' || _options.ignore.includes(filename)) {
                //if file === node_modules skip
                continue;
            }
            const stat = file.isSymbolicLink() ? lstatSync(fullPath) : statSync(fullPath);
            const textColor = setTextColor(filename, stat);
            console.log(colors.GREEN + _options.indent + prefix + textColor + filename + colors.RESET)
            if (stat.isDirectory()) {
                const newIndent = _options.indent + (isLast ? '    ' : '│   ');
                treeRecursive(fullPath, { indent: newIndent, ignoreNodeModules: _options.ignoreNodeModules }); // Recurse into subdirectories
            }
        }
    } catch (error) {
        handleError(error,dir);
    }

}

function handleError(error,data) {
    if (error.code === 'EACCES') {
        console.warn(`Permission denied: ${data}`);
    } else if (error.code === 'ENOENT') {
        console.warn(`File or directory not found: ${data}`);
    } else {
        throw error;
    }
}

async function readIgnore(dir,options = {ignore: [],ignoreFileRead:false}) {
    if (!options.ignoreFileRead) {
        const ignoreFilePath = path.join(dir, '.ignore');
        try {
            const ignoreContent = await fs.readFile(ignoreFilePath, { encoding: 'utf-8' });
           options.ignore = ignoreContent.split('\n').filter(Boolean);//cache if meet the .ignore file in sub dir 
            options.ignoreFileRead = true;//set flag to avoid ignore again
        } catch (error) {
            //ignore error if .ignore doesn't exists
        }
    }
}

async function* treeGenerator(dir, options = {}) {
    if (typeof options !== 'object') {
        throw Error('options param must be an object');
    }
    const defaultOptions = {
        indent: ' '.repeat(4),
        ignoreNodeModules: true,
        ignore: [],
        ignoreFileRead: false ,// keep track if .ignore file hs been read,
        gitTracking:false,
        gitStatus:[]
    };
    const _options = { ...defaultOptions, ...options };
    if(_options.gitTracking) {
        _options.gitStatsus = await getGitStatus(dir);
    }
    let files;
    try {
        files = await fs.readdir(dir, { withFileTypes: true });
        //read .ignore file in the cwd directory add a cache and set ignoreFilere flag to true 
        await readIgnore(dir,_options);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.name;
            const fullPath = path.join(dir, filename);
            const isLast = i === files.length - 1;
            const prefix = isLast ? '└── ' + colors.RESET : '├── ' + colors.RESET;
            const gitIndicator = setGitIndicator(filename,_options.gitStatsus) ?? '  --git-status: OK';
            //default ignore file
            if (_options.ignoreNodeModules && filename === 'node_modules' || filename === '.git' || _options.ignore.includes(filename)) {
                //skip
                continue;
            }
            let stat;
            try {
                stat = file.isSymbolicLink() ? await fs.lstat(fullPath) : await fs.stat(fullPath);
            } catch (error) {
                handleError(error,file)
                continue; // Skip this entry and move to the next
            }
            const textColor = setTextColor(filename, stat);
            const newFilename = gitIndicator !==  '  --git-status: OK' ? filename + '  ' + gitIndicator : filename;
            if (stat.isDirectory()) {
                yield colors.GREEN + _options.indent + prefix + textColor + newFilename + colors.RESET;
                const newIndent = _options.indent + (isLast ? '    ' : '│   ');
                yield* treeGenerator(fullPath, {..._options, indent: newIndent}); // Recurse into subdirectories
            } else {
                yield colors.GREEN + _options.indent + prefix + textColor + newFilename + colors.RESET;
            }
        }
    } catch (error) {
       handleError(error,dir);
    }
}



async function printTree(sourceDir, options) {
    const _sourceDir = sourceDir ?? process.cwd();
    const time = process.hrtime.bigint();
    console.log('Printing directory structure of', _sourceDir);
    for await (const node of treeGenerator(_sourceDir, options)) {
        console.log(node);
        //write to file 
    }
    const memoryUsage = process.memoryUsage();
    const elapsed = ((process.hrtime.bigint() - time) / BigInt(1e6));
    console.log(colors.MAGENTA, `Elapsed Time: ${elapsed.toLocaleString()}ms`, colors.RESET);
    console.log(`Memory Usage: RSS=${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
}

async function printTreeRecursive(sourceDir, options) {
    const _sourceDir = sourceDir ?? process.cwd();
    const time = process.hrtime.bigint();
    console.log('Printing directory structure of', _sourceDir);
    treeRecursive(_sourceDir,options);
    const memoryUsage = process.memoryUsage();
    const elapsed = ((process.hrtime.bigint() - time) / BigInt(1e6));
    console.log(colors.MAGENTA, `Elapsed Time: ${elapsed.toLocaleString()}ms`, colors.RESET);
    console.log(`Memory Usage: RSS=${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
}

module.exports = { printTree, printTreeRecursive,treeGenerator,writeToFile }