const fs = require('fs').promises;
const path = require('path');
const { readdirSync,lstatSync, statSync,readFileSync } = require('fs');
const { checkFileType,setTextColor,stripAINSIColor } = require('./utils');
const colors = require('./colors');

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
            } else if (gitStatus?.modified.includes(relativePath)) {
                gitIndicator = 'Uncommited file';
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

function treeObjectRecursive(dir,opts) {
    let files;
    let tree = [];
    const { ignoreNodeModules, gitStatus } = opts;
    files = readdirSync(dir,{withFileTypes:true});
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
        } else if (gitStatus?.modified.includes(relativePath)) {
            gitIndicator = 'Uncommited file';
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

function treeRecursive(dir, options = {} ) {
    if(typeof options !== 'object') {
        throw Error('options param must be an object');
    }
    let files;
    const defaultOptions = {
        indent:' '.repeat(4),
        ignoreNodeModules:true,
        ignore:[]
    };
    const _options = {...defaultOptions,...options};
        files = readdirSync(dir, { withFileTypes: true });
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.name;
            const fullPath = path.join(dir, filename);
            const isLast = i === files.length - 1;
            const prefix = isLast ? '└── ' + colors.RESET : '├── ' + colors.RESET;

            if (_options.ignoreNodeModules && filename === 'node_modules') {
                //if file === node_modules skip
                continue;
            }
            if(filename === '.git') {
                continue;
            }
            //sparse .ignore file if exist 
            if(filename === '.ignore') {
                //set new options object
                _options.ignore = (readFileSync(fullPath,{encoding:'utf-8'})).split('\n');
                continue//do not print the .ignore in terminal
            }
            if(_options.ignore.includes(filename)) {
                continue;
            }

            
            const stat = file.isSymbolicLink() ? lstatSync(fullPath) : statSync(fullPath);
            const textColor = setTextColor(filename, stat);
             console.log(colors.GREEN + _options.indent + prefix + textColor + filename + colors.RESET )
            if (stat.isDirectory()) {
                const newIndent = _options.indent + (isLast ? '    ' : '│   ');
               treeRecursive(fullPath, { indent: newIndent, ignoreNodeModules: _options.ignoreNodeModules }); // Recurse into subdirectories
            } 
               
        }
}

async function* treeGenerator(dir, options = {}) {
    if(typeof options !== 'object') {
        throw Error('options param must be an object');
    }
    const defaultOptions = {
        indent:' '.repeat(4),
        ignoreNodeModules:true,
        ignore:[]
    };
    const _options = {...defaultOptions,...options};
    let files;
    try {
        files = await fs.readdir(dir, { withFileTypes: true });
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.name;
            const fullPath = path.join(dir, filename);
            const isLast = i === files.length - 1;
            const prefix = isLast ? '└── ' + colors.RESET : '├── ' + colors.RESET;
            //default ignore file
            if (_options.ignoreNodeModules && filename === 'node_modules') {
                //if file === node_modules skip
                continue;
            }
            /*
            if(filename === '.git') {
                continue;
            }
            */
            //sparse .ignore file if exist 
            if(filename === '.ignore') {
                //set new options object
                console.log('options_ignore',_options.ignore);
                _options.ignore = (await fs.readFile(fullPath,{encoding:'utf-8'})).split('\n');
                continue//do not print the .ignore in terminal
            }
            if(_options.ignore.includes(filename)) {
                console.log('options_ignore',_options.ignore,'filename',filename);
                continue;
            }
            //
            const stat = file.isSymbolicLink() ? await fs.lstat(fullPath) : await fs.stat(fullPath);
            const textColor = setTextColor(filename, stat);

            if (stat.isDirectory()) {
                yield colors.GREEN + _options.indent + prefix + textColor + filename + colors.RESET ;
                const newIndent = _options.indent + (isLast ? '    ' : '│   ');
                yield* treeGenerator(fullPath, { indent: newIndent, ignoreNodeModules: _options.ignoreNodeModules,ignore:_options.ignore }); // Recurse into subdirectories
            } else {
                yield colors.GREEN + _options.indent + prefix + textColor + filename + colors.RESET ;
            }
        }
    } catch (error) {
        throw error;
    }

}

function validateOptions(options) {
    if (typeof options !== 'object') throw new TypeError(`${options} must be an object`);
    const allowedKeys = ['ignoreNodeModules', 'objectMode', 'indent'];
    for (const key of Object.keys(options)) {
        if (!allowedKeys.includes(key)) {
            throw new Error(`Invalid options key: ${key}`)
        }
    }
}



module.exports = {treeObjectRecursive,treeObjectGenerator,treeGenerator,treeRecursive }