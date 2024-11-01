#!/usr/bin/env node
const { treeGenerator, treeRecursive } = require('../lib/tree');
const { resolve } = require('node:path');
const process = require('node:process');
const { start } = require('node:repl');
const colors = require('../lib/colors');

/**
 * TODO
 * commands
 * 
 * nodetree -n alias to nodetree node_modules -> print treedir of node_modules
 * nodetree --git -g <sourcedir> show untrackfile and modified files 
 * nodetree  <sourcedir> -o <file> print output to a file 
 * nodetree --json print output on json format
 * nodetree -e regex find file by regex ?
 */



const time = process.hrtime.bigint();
const sourceDir = resolve(process.cwd(),(process.argv.slice(2)[0]) || '');

//nodetree <sourceDir> --ignore=file1,file2,file3

async function printTree() {
    console.log('Printing directory structure of',sourceDir);
    for await (const node of treeGenerator(sourceDir)) {
        console.log(node)
    }
    const memoryUsage = process.memoryUsage();
    const elapsed = ((process.hrtime.bigint() - time) / BigInt(1e6));
    console.log(colors.MAGENTA,`Elapsed Time: ${elapsed.toLocaleString()}ms`,colors.RESET); 
    console.log(`Memory Usage: RSS=${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
}

function printTreeRecursive() {
    console.log('Printing directory structure recursivly of',sourceDir);
    treeRecursive(sourceDir);
    const memoryUsage = process.memoryUsage();
    const elapsed = ((process.hrtime.bigint() - time) / BigInt(1e6));
    console.log(colors.MAGENTA,`Elapsed Time: ${elapsed.toLocaleString()}ms`,colors.RESET); 
    console.log(`Memory Usage: RSS=${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
}


//printTreeRecursive();
printTree();
