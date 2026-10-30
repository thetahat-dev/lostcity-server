'use strict';

// Starts the built server, checks that the web client and game port answer, then shuts it down.

const child_process = require('child_process');
const fs = require('fs');
const net = require('net');

const TIMEOUT_MS = 300000;
const SHUTDOWN_TIMEOUT_MS = 30000;
const GAME_PORT = 43594;

const world = JSON.parse(fs.readFileSync('engine/data/config/world.json', 'utf8'));
const webPort = world.web.port;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function portOpen(port) {
    return new Promise(resolve => {
        const socket = net.connect(port, 'localhost');
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => resolve(false));
    });
}

async function webClientOk() {
    try {
        const response = await fetch(`http://localhost:${webPort}/rs2.cgi`);
        return response.status === 200;
    } catch {
        return false;
    }
}

async function main() {
    if (await portOpen(webPort) || await portOpen(GAME_PORT)) {
        console.error('Smoke test needs the server ports free. Stop the running server first.');
        return 1;
    }

    const server = child_process.spawn('node_modules/.bin/tsx', ['src/app.ts'], {
        cwd: 'engine',
        detached: true,
        stdio: ['ignore', 'pipe', 'inherit']
    });

    let log = '';
    let exited = false;
    server.stdout.on('data', data => {
        log += data;
        process.stdout.write(data);
    });
    server.once('exit', () => {
        exited = true;
    });

    let passed = false;
    const deadline = Date.now() + TIMEOUT_MS;
    while (!exited && Date.now() < deadline) {
        if (log.includes('World ready') && await webClientOk() && await portOpen(GAME_PORT)) {
            passed = true;
            break;
        }

        await sleep(1000);
    }

    if (!exited) {
        process.kill(-server.pid, 'SIGTERM');

        const shutdownDeadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
        while (!exited && Date.now() < shutdownDeadline) {
            await sleep(500);
        }

        if (!exited) {
            process.kill(-server.pid, 'SIGKILL');
        }
    }

    console.log(passed ? 'Smoke test passed' : 'Smoke test failed');
    return passed ? 0 : 1;
}

main().then(code => process.exit(code));
