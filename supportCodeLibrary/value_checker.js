export function doesHaveValue(value) {
    return !doesNotHaveValue(value)
}

export function doesNotHaveValue(value) {
    return value === null || value === undefined
}

export function valueOrDefault(value, defaultValue) {
    if (doesHaveValue(value)) {
        return value
    }
    return defaultValue
}
