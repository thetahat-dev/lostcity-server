'use strict';

const child_process = require('child_process');
const fs = require('fs');

const { ExitPromptError } = require('@inquirer/core');
const { select } = require('@inquirer/prompts');

function syncPins() {
    child_process.execSync('node pins.js sync', {
        stdio: 'inherit'
    });
}

function runOnOs(exec, cwd) {
    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');

    child_process.execSync(`${start} ${exec}`, {
        stdio: 'inherit',
        cwd
    });
}

let config = {
    rev: 'unset'
};

const revInfo = {
    '225': {
        description: 'May 18, 2004',
        webclient: true
    },
    '244': {
        description: 'June 28, 2004',
        webclient: true
    },
    '245.2': {
        description: 'July 13, 2004 (there were 3 "245" builds!)',
        webclient: true
    },
    '254': {
        description: 'September 7, 2004',
        webclient: true
    },
    '274': {
        description: 'November 23, 2004',
        webclient: true
    },
    '289': {
        description: 'January 17, 2005',
        wip: true,
        webclient: true
    },
    '377-wip': {
        description: 'May 5, 2006',
        wip: true,
        clientBranch: '377'
    }
};

let running = true;
async function main() {
    syncPins();

    config = JSON.parse(fs.readFileSync('server.json', 'utf8'));

    const choice = await select({
        message: 'What would you like to do?',
        choices: [{
            name: 'Start Server',
            description: 'Starts the server normally',
            value: 'start'
        },
        revInfo[config.rev]?.webclient ? {
            name: 'Run Web Client',
            description: 'Opens your browser to play using the modern web client (TypeScript)',
            value: 'web'
        } : {
            name: 'Run Web Client (unavailable)',
            description: 'Not available in this version.',
            value: ''
        },
        {
            name: 'Run Java Client',
            description: 'Opens the legacy Java applet to play using the original client',
            value: 'java'
        }, {
            name: 'Advanced Options',
            description: 'View more options',
            value: 'advanced'
        }, {
            name: 'Quit',
            description: '',
            value: 'quit'
        }]
    }, { clearPromptOnDone: true });

    if (choice === 'start') {
        child_process.execSync('npm start', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'web') {
        if (!revInfo[config.rev]?.webclient) {
            console.log('This version does not have a webclient available (yet?), sorry.');
        } else {
            const world = JSON.parse(fs.readFileSync('engine/data/config/world.json', 'utf8'));
            runOnOs(`http://localhost:${world.web.port}/rs2.cgi`);
        }
    } else if (choice === 'java') {
        const command = process.platform === 'win32' ? 'gradlew' : './gradlew';
        if (config.rev === '225') {
            child_process.execSync(`${command} run --args="10 0 highmem members"`, {
                stdio: 'inherit',
                cwd: 'javaclient'
            });
        } else {
            child_process.execSync(`${command} run --args="10 0 highmem members 32"`, {
                stdio: 'inherit',
                cwd: 'javaclient'
            });
        }
    } else if (choice === 'advanced') {
        await promptAdvanced();
    } else if (choice === 'quit') {
        running = false;
    }
}

async function promptAdvanced() {
    const choice = await select({
        message: 'What would you like to do?',
        choices: [{
            name: 'Start Server (engine dev)',
            description: 'Starts the server and watches for .ts file changes to reload',
            value: 'start-dev'
        }, {
             name: 'Reconfigure Server',
             description: 'Edit the environment config for the server',
             value: 'configure'
        }, {
            name: 'Clean-build Server',
            description: '',
            value: 'clean-build'
        },
        revInfo[config.rev]?.webclient ? {
            name: 'Build Web Client',
            description: '',
            value: 'build-web'
        } : {
            name: 'Build Web Client (unavailable)',
            description: 'Not available in this version.',
            value: ''
        },
        {
            name: 'Build Java Client',
            description: '',
            value: 'build-java'
        }, {
            name: 'Back',
            description: 'Go back',
            value: 'back'
        }]
    }, { clearPromptOnDone: true });

    if (choice === 'start-dev') {
        child_process.execSync('npm run dev', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'configure') {
        child_process.spawnSync('npm run setup', {
            shell: true,
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'clean-build') {
        child_process.execSync('npm run clean', {
            stdio: 'inherit',
            cwd: 'engine'
        });

        child_process.execSync('npm run build', {
            stdio: 'inherit',
            cwd: 'engine'
        });
    } else if (choice === 'build-web') {
        child_process.execSync('npm run build', {
            stdio: 'inherit',
            cwd: 'webclient'
        });

        fs.copyFileSync('webclient/out/client.js', 'engine/public/client/client.js');
    } else if (choice === 'build-java') {
        const command = process.platform === 'win32' ? 'gradlew' : './gradlew';
        child_process.execSync(`${command} build`, {
            stdio: 'inherit',
            cwd: 'javaclient'
        });
    }
}

async function run() {
    try {
        while (running) {
            await main();
        }
    } catch (e) {
        if (e instanceof ExitPromptError) {
            process.exit(0);
        } else if (e instanceof Error) {
            if (e.message.startsWith('Command failed:')) {
                process.exit(0);
            }

            console.log(e.message);
        }
    }
}

run();
