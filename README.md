# nodetree 🌳

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-experimental-orange)]()

Affiche l’arborescence d’un répertoire Node.js avec une sortie **colorée**, similaire à la commande Unix `tree`, avec support des fichiers `.ignore`, export fichier et intégration Git (WIP).

---

##  Fonctionnalités

-  Parcours récursif de dossiers
-  Sortie console colorée (ANSI)
-  Support du fichier `.ignore`
-  Ignore automatiquement `node_modules` et `.git`
-  Export de l’arborescence dans un fichier texte
-  Version async (generator) et sync
-  Utilisable en CLI **ou** comme librairie
-  Tests avec le test runner natif de Node.js
-  (WIP) Indicateurs de statut Git

---

##  Installation

### Depuis npm (quand publié)

```bash
npm install -g nodetree
```
### Depuis le repo
```sh
git clone https://github.com/ben-sentenac/nodetree.git
cd nodetree
npm install
```

## CLI Utilisation

```bash

nodetree --help

```

## Exemple de sortie
```txt
├── src
│   ├── index.js
│   └── utils.js
├── package.json
└── README.md
```
---

## API Node.js

```js
const { printTree, treeGenerator, writeToFile } = require('nodetree');

await printTree('.');
```

### API

`printTree(sourceDir?, options?)`
Affiche l’arborescence avec mesures de performance.

---

`printTreeRecursive(sourceDir?, options?)`
Version synchrone (fs sync).

---

`treeGenerator(dir, options?) → AsyncGenerator<string>`

```js
for await (const line of treeGenerator('.')) {
  console.log(line);
}
```
---

`writeToFile(sourceDir, output?)`
Écrit l’arborescence dans un fichier texte sans codes ANSI.
```js
await writeToFile('.', 'tree.log');
```
---


### Options
| Option              | Type     | Défaut   | Description                   |
| ------------------- | -------- | -------- | ----------------------------- |
| `ignoreNodeModules` | boolean  | `true`   | Ignore `node_modules`         |
| `indent`            | string   | `'    '` | Indentation initiale          |
| `ignore`            | string[] | `[]`     | Entrées ignorées              |
| `ignoreFileRead`    | boolean  | `false`  | Cache la lecture du `.ignore` |
| `gitTracking`       | boolean  | `false`  | Active le tracking Git        |
| `gitStatus`         | object   | `{}`     | Statut Git interne            |

## Fichier `.ignore`

```txt
dist
coverage
secret.txt
```
Appliqué récursivement

---

## Roadmap

- [ ] Stabiliser Git integration

- [ ] Export JSON / Object tree

- [ ] Glob patterns dans .ignore

- [ ] Coverage

- [ ] Benchmarks

- [ ] Mode silencieux

## 📜 Licence

MIT © Ben Sentenac