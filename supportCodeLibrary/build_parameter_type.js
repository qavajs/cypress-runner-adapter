import {ParameterType} from '@cucumber/cucumber-expressions'

export function buildParameterType({ name, regexp, transformer, useForSnippets, preferForRegexpMatch }) {
    if (typeof useForSnippets !== 'boolean') useForSnippets = true
    if (typeof preferForRegexpMatch !== 'boolean') preferForRegexpMatch = false
    return new ParameterType(
        name,
        regexp,
        null,
        transformer,
        useForSnippets,
        preferForRegexpMatch
    )
}
