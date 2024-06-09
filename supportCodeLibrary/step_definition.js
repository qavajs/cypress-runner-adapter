import Definition from './definition';
import { doesHaveValue } from './value_checker';
import DataTable from './data_table';
import { parseStepArgument } from './step_argument';

export default class StepDefinition extends Definition {
    constructor(data) {
        super(data)
        this.keyword = data.keyword
        this.pattern = data.pattern
        this.expression = data.expression
    }

    getInvocationParameters({ step, world }) {
        const parameters = this.expression.match(step.text).map((arg) => arg.getValue(world))
        if (doesHaveValue(step.argument)) {
            const argumentParameter = parseStepArgument(step.argument, {
                dataTable: (arg) => new DataTable(arg),
                docString: (arg) => arg.content,
            })
            parameters.push(argumentParameter)
        }
        return {
            getInvalidCodeLengthMessage: () =>
                this.baseGetInvalidCodeLengthMessage(parameters),
            parameters,
            validCodeLengths: [parameters.length, parameters.length + 1],
        }
    }

    matchesStepName(stepName) {
        return doesHaveValue(this.expression.match(stepName))
    }
}
