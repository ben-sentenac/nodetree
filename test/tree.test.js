const assert = require('node:assert');
const { test } = require('node:test');
const path = require('node:path');
const { readdir,rm } = require('node:fs/promises');
const { treeGenerator,writeToFile } = require ('../lib/tree.js');

const sourceDir = path.join(__dirname,'templates');
const lines = [];


test('treeGenerator test', async (t) => {

});