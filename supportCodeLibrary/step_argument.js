import { doesHaveValue } from './value_checker';

export function parseStepArgument(
    arg,
    mapping
) {
    if (doesHaveValue(arg.dataTable)) {
        return mapping.dataTable(arg.dataTable)
    } else if (doesHaveValue(arg.docString)) {
        return mapping.docString(arg.docString)
    }
    throw new Error(`Unknown step argument: ${arg}`)
}
