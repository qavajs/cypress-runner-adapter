import { defineConfig } from 'cypress';
import cucumber from '../adapter/index.js';

export default defineConfig({
    e2e: {
        specPattern: 'test/feature/**/*.feature',
        supportFile: 'test/cypress-ts/support/e2e.ts',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
        viewportWidth: 1920,
        viewportHeight: 1080,
        defaultBrowser: 'chrome',
    },
});
