import {
    ParameterType,
    ParameterTypeRegistry,
} from '@cucumber/cucumber-expressions'

export class SourcedParameterTypeRegistry extends ParameterTypeRegistry {
    parameterTypeToSource = new WeakMap()

    defineSourcedParameterType(
        parameterType,
        source
    ) {
        this.defineParameterType(parameterType)
        this.parameterTypeToSource.set(parameterType, source)
    }

    lookupSource(parameterType) {
        return this.parameterTypeToSource.get(parameterType)
    }
}
