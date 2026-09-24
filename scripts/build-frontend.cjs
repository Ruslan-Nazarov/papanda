const esbuild = require('esbuild');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function main() {
    const result = await esbuild.build({absWorkingDir: root, entryPoints: {
        app: 'fastapi_app/static/js/notes/app.js', runtime: 'fastapi_app/static/js/runtime.js',
        styles: 'fastapi_app/static/css/notes.css', vendor: 'fastapi_app/static/css/vendor.css',
    }, outdir: 'fastapi_app/static/dist', bundle: true, format: 'esm', splitting: true,
    entryNames: '[name]-[hash]', chunkNames: 'chunks/[name]-[hash]', assetNames: 'assets/[name]-[hash]',
    loader: {'.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file', '.svg': 'file'},
    target: ['es2022'], minify: true, metafile: true, legalComments: 'linked'});
    const manifest = {};
    for (const [output, meta] of Object.entries(result.metafile.outputs)) {
        if (meta.entryPoint) {
            const entry = path.basename(meta.entryPoint);
            manifest[entry] = '/' + output.replace(/^fastapi_app\//, '');
        }
    }
    await fs.writeFile(path.join(root, 'fastapi_app/static/dist/manifest.json'), JSON.stringify(manifest, null, 2)+'\n');
    console.log('Built local frontend:', Object.keys(manifest).join(', '));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
