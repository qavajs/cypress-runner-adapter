const {defineConfig} = require('cypress');
const cucumber = require('../adapter');

module.exports = defineConfig({
    e2e: {
        specPattern: 'test/cypress/feature/real_test.feature',
        supportFile: 'test/cypress/support/e2e.js',
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber);
        },
        viewportWidth: 1920,
        viewportHeight: 1080,
        reporter: 'mochawesome',
    },
});
