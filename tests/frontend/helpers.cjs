const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../fastapi_app/static/js/notes');

// Load the actual module body with controlled imports. This is a unit harness,
// not a replacement for browser tests of module loading and the real DOM.
function source(name, symbol = name) {
    return fs.readFileSync(path.join(root, name + '.js'), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/^export default .*;\r?$/gm, '')
        .replace(/^export (?=const |class |function )/gm, '') + `\n;globalThis.${symbol} = ${symbol};`;
}
function context(extra = {}) {
    return vm.createContext({console, setTimeout, clearTimeout, setInterval, clearInterval, TextDecoder, Response, AbortController, ReadableStream, crypto: require('node:crypto').webcrypto,
        localStorage: {getItem() {return null;}, setItem() {}, removeItem() {}},
        document: {dispatchEvent() {}, getElementById() {return null;}},
        CustomEvent: class {}, Event: class {}, t: key => key, ...extra});
}
function load(ctx, name, symbol) {
    if (['AIController', 'SessionCheckpoints'].includes(name) && !ctx.Lifecycle) load(ctx, 'Lifecycle');
    if (name === 'api' && !ctx.ApiContracts) load(ctx, 'ApiContracts');
    if (name === 'AppState' && !ctx.NoteStore) {
        load(ctx, 'BlockConstants');
        load(ctx, 'NoteStore');
    }
    if (name === 'NoteStorageService' && !ctx.SaveCoordinator) load(ctx, 'SaveCoordinator');
    vm.runInContext(source(name, symbol), ctx);
}
module.exports = {source, context, load};
