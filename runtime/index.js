import { runDescribe } from './describe.js';
import { runIt } from './it.js';
import { recorder, MESSAGES_TASK } from './messages.js';

/**
 * @param {object} gherkinDocument
 * @param {object[]} pickles
 * @param {object} options
 * @param {'describe' | 'it'} options.mode - translation mode
 * @param {boolean} options.messages - record cucumber messages
 * @param {string} [options.source] - feature file content
 */
export function run(gherkinDocument, pickles, { mode, messages = false, source = '' }) {
    recorder.init({ enabled: messages, source, gherkinDocument, pickles, library: window.supportCodeLibrary });
    if (mode === 'it') {
        runIt(gherkinDocument, pickles);
    } else {
        runDescribe(gherkinDocument, pickles);
    }
    if (messages) {
        after(function () {
            cy.task(MESSAGES_TASK, recorder.flush(), { log: false });
        });
    }
}
