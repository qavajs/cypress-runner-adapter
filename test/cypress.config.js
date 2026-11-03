import { defineConfig } from 'cypress';
import { setupCucumber } from '../adapter/index.js';

export default defineConfig({
    e2e: {
        specPattern: 'test/feature/**/*.feature',
        supportFile: 'test/cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            return setupCucumber(on, config, { messages: 'test/reports/messages.ndjson' });
        },
        viewportWidth: 1920,
        viewportHeight: 1080,
        defaultBrowser: 'chrome'
    }
});
