// test/tree.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { treeGenerator, writeToFile } = require('../lib/tree.js'); // <-- adapte le chemin vers ton module

function stripAnsiLocal(s) {
  // simple strip ANSI, pour ne pas dépendre de ./utils dans les assertions
  return String(s).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

async function mkFixture(structure) {
  // structure: { "file.txt": "content", "dir": { ... }, "symlink:name": "target" }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tree-tests-'));

  async function writeNode(base, node) {
    for (const [name, value] of Object.entries(node)) {
      if (name.startsWith('symlink:')) {
        const linkName = name.slice('symlink:'.length);
        await fs.symlink(value, path.join(base, linkName));
        continue;
      }
      const full = path.join(base, name);
      if (value && typeof value === 'object') {
        await fs.mkdir(full, { recursive: true });
        await writeNode(full, value);
      } else {
        await fs.writeFile(full, String(value ?? ''), 'utf8');
      }
    }
  }

  await writeNode(root, structure);
  return root;
}

async function collect(gen) {
  const out = [];
  for await (const line of gen) out.push(line);
  return out;
}

test('treeGenerator: throw si options n’est pas un objet', async () => {
  const dir = await mkFixture({ 'a.txt': 'x' });
  await assert.rejects(
    async () => collect(treeGenerator(dir, 'not-an-object')),
    /options param must be an object/
  );
  await fs.rm(dir, { recursive: true, force: true });
});

test('treeGenerator: liste fichiers & dossiers (sans se baser sur les couleurs)', async () => {
  const dir = await mkFixture({
    'file1.txt': 'hello',
    sub: {
      'file2.js': 'console.log(1);',
    },
  });

  const lines = await collect(treeGenerator(dir, { ignoreNodeModules: false }));
  const plain = lines.map(stripAnsiLocal).join('\n');

  assert.match(plain, /file1\.txt/);
  assert.match(plain, /sub/);
  assert.match(plain, /file2\.js/);

  await fs.rm(dir, { recursive: true, force: true });
});

test('treeGenerator: ignore node_modules (par défaut) et .git', async () => {
  const dir = await mkFixture({
    'keep.txt': 'ok',
    node_modules: { 'dep.txt': 'nope' },
    '.git': { 'config': 'nope' },
  });

  const lines = await collect(treeGenerator(dir)); // ignoreNodeModules=true par défaut
  const plain = lines.map(stripAnsiLocal).join('\n');

  assert.match(plain, /keep\.txt/);
  assert.doesNotMatch(plain, /node_modules/);
  assert.doesNotMatch(plain, /dep\.txt/);
  assert.doesNotMatch(plain, /\.git/);

  await fs.rm(dir, { recursive: true, force: true });
});

test('treeGenerator: lit .ignore et ignore les fichiers listés (y compris dans sous-dossiers)', async () => {
  const dir = await mkFixture({
    '.ignore': 'ignoreme.txt\nalsoignore.log\n',
    'ignoreme.txt': 'root',
    'alsoignore.log': 'root',
    'keep.txt': 'root',
    sub: {
      'ignoreme.txt': 'sub',
      'keep2.txt': 'sub',
    },
  });

  const lines = await collect(treeGenerator(dir));
  const plain = lines.map(stripAnsiLocal).join('\n');

  assert.match(plain, /keep\.txt/);
  assert.match(plain, /keep2\.txt/);

  assert.doesNotMatch(plain, /ignoreme\.txt/);
  assert.doesNotMatch(plain, /alsoignore\.log/);

  await fs.rm(dir, { recursive: true, force: true });
});

test('treeGenerator: gère les symlinks (ne crash pas)', async () => {
  const dir = await mkFixture({
    real: { 'a.txt': 'x' },
    // symlink nommé "linkToReal" pointant vers "real"
    'symlink:linkToReal': 'real',
  });

  const lines = await collect(treeGenerator(dir, { ignoreNodeModules: false }));
  const plain = lines.map(stripAnsiLocal).join('\n');

  // On ne force pas un format exact, on vérifie juste que ça ne plante pas et que le lien est listé.
  assert.match(plain, /real/);
  assert.match(plain, /linkToReal/);

  await fs.rm(dir, { recursive: true, force: true });
});

test('treeGenerator: si dossier inexistant -> ne throw pas (handleError ENOENT) et yield rien', async () => {
  const missing = path.join(os.tmpdir(), 'tree-tests-missing-' + Date.now());
  const lines = await collect(treeGenerator(missing));
  assert.equal(lines.length, 0);
});

test('writeToFile: écrit un fichier et retire les codes ANSI des lignes', async () => {
  const dir = await mkFixture({
    'keep.txt': 'ok',
    sub: { 'inner.txt': 'ok' },
  });

  const outFile = path.join(dir, 'out.log');
  await writeToFile(dir, outFile);

  const content = await fs.readFile(outFile, 'utf8');

  assert.match(content, new RegExp(`Directory structure from ${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`));
  assert.match(content, /keep\.txt/);
  assert.match(content, /inner\.txt/);

  // pas de codes ANSI dans le fichier final
  assert.doesNotMatch(content, /\x1B\[/);

  await fs.rm(dir, { recursive: true, force: true });
});
