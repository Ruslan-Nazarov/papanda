const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../fastapi_app/static/js');
function files(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? files(file) : file.endsWith('.js') ? [file] : [];
    });
}
const all = files(root);
for (const file of all) {
    const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
    if (result.error) throw result.error;
    if (result.status !== 0) {
        process.stderr.write(result.stderr);
        process.exit(result.status || 1);
    }
}
console.log(`Syntax OK: ${all.length} JavaScript files`);
