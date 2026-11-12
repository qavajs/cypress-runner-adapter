const CONFIG_TAG = /^@(\w+)\((.*)\)$/;
const SKIP_TAG = /^@skip(?:\((.*)\))?$/;

export function hasTag(pickle, tag) {
    return pickle.tags.some(({ name }) => name === tag);
}

/**
 * Reason of @skip(reason) tag; empty string for plain @skip, undefined if scenario is not skipped
 * @param {object} pickle
 * @returns {string | undefined}
 */
export function skipReason(pickle) {
    for (const { name } of pickle.tags) {
        const match = name.match(SKIP_TAG);
        if (match) return match[1] ?? '';
    }
}

/**
 * Mocha function respecting @only and @skip tags
 * @param {Function} fn - describe or it
 * @param {object} pickle
 */
export function withFocus(fn, pickle) {
    if (hasTag(pickle, '@only')) return fn.only;
    if (skipReason(pickle) !== undefined) return fn.skip;
    return fn;
}

/**
 * Mocha title of scenario, includes reason of @skip(reason) tag
 * @param {object} pickle
 */
export function scenarioTitle(pickle) {
    const reason = hasTag(pickle, '@only') ? '' : skipReason(pickle);
    return `Scenario: ${pickle.name}` + (reason ? ` (skipped: ${reason})` : '');
}

function parseValue(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

/**
 * Cypress test configuration from tags like @retries(2) or @viewportWidth(800)
 * @param {object} pickle
 * @returns {object}
 */
export function tagConfig(pickle) {
    const config = {};
    const cypressConfig = Cypress.config();
    for (const { name } of pickle.tags) {
        const match = name.match(CONFIG_TAG);
        if (match && match[1] in cypressConfig) {
            config[match[1]] = parseValue(match[2]);
        }
    }
    return config;
}
