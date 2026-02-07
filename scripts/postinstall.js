import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory relative to this script
const targetDir = path.resolve(__dirname, '../node_modules/@blocksuite');

const typoValues = [
    { from: 'CheckBoxCkeckSolidIcon', to: 'CheckBoxCheckSolidIcon' }
];

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && file.endsWith('.js')) {
            callback(filepath);
        }
    }
}

console.log('🔧 Fixing @blocksuite icon typos...');

if (!fs.existsSync(targetDir)) {
    console.log(`⚠️  Target directory not found: ${targetDir}`);
    process.exit(0);
}

let fixedCount = 0;

walk(targetDir, (filepath) => {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    typoValues.forEach(({ from, to }) => {
        if (content.includes(from)) {
            // Global replacement
            content = content.split(from).join(to);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        fixedCount++;
    }
});

console.log(`✅ @blocksuite fixes applied to ${fixedCount} files.`);
