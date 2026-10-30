'use strict';

// Keeps the engine, content and client checkouts on the exact commits listed in pins.json.
//   node pins.js sync    clone anything missing at its pinned commit
//   node pins.js check   fail if a checkout is dirty or not on its pinned commit
//   node pins.js record  write the current commits into pins.json

const child_process = require('child_process');
const fs = require('fs');

const PINS_PATH = 'pins.json';
const pins = JSON.parse(fs.readFileSync(PINS_PATH, 'utf8'));

function git(dir, ...args) {
    return child_process.execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

function checkNode() {
    const wanted = fs.readFileSync('.nvmrc', 'utf8').trim();
    if (process.versions.node !== wanted) {
        fail(`Node ${wanted} is required but this is ${process.versions.node}. Run: nvm install ${wanted} && nvm use ${wanted}`);
    }
}

function sync() {
    for (const [dir, repo] of Object.entries(pins.repos)) {
        if (!fs.existsSync(dir)) {
            child_process.execFileSync('git', ['clone', repo.url, '--single-branch', '-b', repo.branch, dir], { stdio: 'inherit' });
            git(dir, 'reset', '--hard', repo.commit);
        }
    }

    if (!fs.existsSync('server.json')) {
        fs.writeFileSync('server.json', JSON.stringify({ rev: pins.rev }, null, 2));
    }

    if (!fs.existsSync('engine/data/config/world.json')) {
        fs.copyFileSync('config/world.json', 'engine/data/config/world.json');
    }

    check();
}

function check() {
    let ok = true;

    for (const [dir, repo] of Object.entries(pins.repos)) {
        const head = git(dir, 'rev-parse', 'HEAD');
        const dirty = git(dir, 'status', '--porcelain').length > 0;

        if (head !== repo.commit) {
            console.error(`${dir}: on ${head}, pinned to ${repo.commit}`);
            ok = false;
        } else if (dirty) {
            console.error(`${dir}: has uncommitted changes`);
            ok = false;
        } else {
            console.log(`${dir}: ${head}`);
        }
    }

    if (!ok) {
        fail('Checkouts do not match pins.json. If this is intentional, commit your work and run: npm run record');
    }
}

function record() {
    for (const [dir, repo] of Object.entries(pins.repos)) {
        if (git(dir, 'status', '--porcelain').length > 0) {
            fail(`${dir}: commit or discard your changes before recording`);
        }

        repo.commit = git(dir, 'rev-parse', 'HEAD');
    }

    fs.writeFileSync(PINS_PATH, JSON.stringify(pins, null, 2) + '\n');
    check();
}

checkNode();

const commands = { sync, check, record };
const command = commands[process.argv[2]];
if (!command) {
    fail('Usage: node pins.js sync|check|record');
}

command();
