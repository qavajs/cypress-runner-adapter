function collect(locations, node) {
    if (!node) return;
    if (node.id && node.location) locations.set(node.id, node.location);
    for (const step of node.steps ?? []) {
        locations.set(step.id, step.location);
    }
    for (const examples of node.examples ?? []) {
        for (const row of examples.tableBody ?? []) {
            locations.set(row.id, row.location);
        }
    }
    for (const child of node.children ?? []) {
        collect(locations, child.background);
        collect(locations, child.scenario);
        collect(locations, child.rule);
    }
}

/**
 * Resolve feature file locations of pickles and pickle steps
 */
export function createLocator(gherkinDocument) {
    const locations = new Map();
    collect(locations, gherkinDocument.feature);
    return function locate(node) {
        const location = locations.get(node.astNodeIds[0]);
        return location ? `${gherkinDocument.uri}:${location.line}` : gherkinDocument.uri;
    };
}

/**
 * Append feature file location to error message
 */
export function withLocation(error, location) {
    if (!error) return error;
    // steps/hooks may throw a non-Error value; wrap it so location can still be attached
    if (typeof error !== 'object') return withLocation(new Error(String(error)), location);
    if (!error.qavajsLocation) {
        error.qavajsLocation = location;
        error.message = `${error.message}\n\n    at ${location}`;
    }
    return error;
}
