import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { version as protocolVersion } from '@cucumber/messages';
import { MESSAGES_TASK } from '../runtime/messages.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

function timestamp(ms = Date.now()) {
    return { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 };
}

/**
 * Collect cucumber messages sent by specs and write them as NDJSON
 * @param {Cypress.PluginEvents} on
 * @param {string} outputPath - absolute path of .ndjson file
 */
export function registerMessagesWriter(on, outputPath) {
    let started = false;
    let success = true;
    const write = envelope => appendFileSync(outputPath, JSON.stringify(envelope) + '\n', 'utf-8');

    function start() {
        if (started) return;
        started = true;
        success = true;
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, '', 'utf-8');
        write({
            meta: {
                protocolVersion,
                implementation: { name: '@qavajs/cypress-runner-adapter', version },
                runtime: { name: 'node.js', version: process.versions.node },
                os: { name: process.platform },
                cpu: { name: process.arch }
            }
        });
        write({ testRunStarted: { timestamp: timestamp() } });
    }

    on('before:run', start);
    on('task', {
        [MESSAGES_TASK]({ envelopes, success: specSuccess }) {
            start();
            for (const envelope of envelopes) write(envelope);
            success &&= specSuccess;
            return null;
        }
    });
    on('after:run', () => {
        if (!started) return;
        write({ testRunFinished: { success, timestamp: timestamp() } });
        started = false;
    });
}
