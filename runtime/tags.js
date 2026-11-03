const CONFIG_TAG = /^@(\w+)\((.*)\)$/;

export function hasTag(pickle, tag) {
    return pickle.tags.some(({ name }) => name === tag);
}

/**
 * Mocha function respecting @only and @skip tags
 * @param {Function} fn - describe or it
 * @param {object} pickle
 */
export function withFocus(fn, pickle) {
    if (hasTag(pickle, '@only')) return fn.only;
    if (hasTag(pickle, '@skip')) return fn.skip;
    return fn;
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
