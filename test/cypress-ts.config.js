const {defineConfig} = require('cypress');
const cucumber = require('../adapter');

module.exports = defineConfig({
    e2e: {
        specPattern: 'test/feature/**/*.feature',
        supportFile: 'test/cypress-ts/support/e2e.ts',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
        viewportWidth: 1920,
        viewportHeight: 1080
    },
});
