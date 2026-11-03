import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/', 'test/reports/', 'mochawesome-report/', 'cypress/']
    },
    js.configs.recommended,
    {
        files: ['adapter/**/*.js', 'test/unit/**/*.js', 'test/*.js', 'eslint.config.js'],
        languageOptions: { globals: globals.node }
    },
    {
        files: ['runtime/**/*.js', 'supportCodeLibrary/**/*.js', 'test/cypress/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.mocha,
                cy: 'readonly',
                Cypress: 'readonly',
                expect: 'readonly'
            }
        }
    },
    {
        rules: {
            'no-unused-vars': ['error', { args: 'none' }]
        }
    }
];
