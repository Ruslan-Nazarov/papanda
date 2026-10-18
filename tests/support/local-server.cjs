const {spawn} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname, '../..');

async function startServer(options = {}) {
    const probe = net.createServer().listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    await fs.mkdir(path.join(root, '.cache'), {recursive: true});
    const directory = await fs.mkdtemp(path.join(root, '.cache/acceptance-server-'));
    const env = {...process.env, HOST: '127.0.0.1', PORT: String(port), UVICORN_RELOAD: '0',
        APP_EDITION: 'author', DEMO_MODE: 'true', DEMO_MAX_SESSIONS: '0', SECRET_KEY: 'acceptance-test-only',
        DATABASE_URL: '', DATA_DIR: directory, DB_DIR: directory, DEMO_DIR: path.join(directory, 'demo'),
        PAPANDA_LIBRARY_FILE: path.join(directory, 'library_notes.json'), ...options};
    for (const key of ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY',
        'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY', 'LIBRARY_PUBLISH_URL', 'LIBRARY_PUBLISH_KEY']) env[key] = '';
    const python = process.env.TEST_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(python, ['run.py'], {cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let log = '';
    child.stdout.on('data', chunk => {log += chunk;});
    child.stderr.on('data', chunk => {log += chunk;});
    const stop = async () => {
        if (child.exitCode !== null) return;
        const exited = once(child, 'exit');
        child.kill();
        await exited;
    };
    const url = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(log);
        if (await fetch(url + '/health', {signal: AbortSignal.timeout(2000)}).then(res => res.ok).catch(() => false)) {
            return {url, directory, stop, log: () => log};
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    await stop();
    throw new Error('Acceptance server did not start: ' + log);
}

module.exports = {startServer};
