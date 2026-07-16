import { defineConfig } from 'cypress';
import cucumber from '../adapter/index.js';

export default defineConfig({
    e2e: {
        specPattern: 'test/feature/**/*.feature',
        supportFile: 'test/cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
        viewportWidth: 1920,
        viewportHeight: 1080
    },
});
