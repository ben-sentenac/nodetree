const assert = require('node:assert');
const { test } = require('node:test');
const path = require('node:path');
const { readdir,rm } = require('node:fs/promises');
const { treeGenerator,writeToFile } = require ('../tree');

const sourceDir = path.join(__dirname,'templates');
const lines = [];


test('treeGenerator test', async (t) => {

   await t.test('should generate tree of directory structure with ainsi color code', async (t) => {
        const tGenerator = treeGenerator(sourceDir);
        for await (const line of tGenerator) {
            lines.push(line);
        }
        assert.ok(lines.length === 1021);
        assert.ok(lines[0] === '\x1B[32m├── \x1B[0m\x1B[31m.env\x1B[0m');
        assert.ok(lines.includes('\x1B[32m│   ├── \x1B[0m\x1B[34mcli-color\x1B[0m'))
    });
});

test('writeToFile test', async (t) => {
    await t.test('should write log to txt file in the current working directory ', async (t) => {
         await writeToFile(sourceDir);
        assert.ok((await readdir('.')).includes('tree_log')); 
        await t.test('deleting tree_log_if_exists', async(t) => {
            try {
               const removedFile = await rm('tree_log'); 
               assert.ok(removedFile === undefined);
            } catch (error) {
                throw error;
            }
        })
    });
    await t.test('should write structure to json file in the current working directory ', async (t) => {
      
   });
});