import Definition from './definition.js';
import { doesHaveValue } from './value_checker.js';
import DataTable from './data_table.js';
import { parseStepArgument } from './step_argument.js';

export default class StepDefinition extends Definition {
    constructor(data) {
        super(data);
        this.keyword = data.keyword;
        this.pattern = data.pattern;
        this.expression = data.expression;
        this.options = data.options ?? {};
    }

    getInvocationParameters({ step, world }) {
        const parameters = this.expression.match(step.text).map(arg => arg.getValue(world));
        if (doesHaveValue(step.argument)) {
            // World#executeStep accepts a DataTable instance or plain string directly;
            // pickle steps carry the raw gherkin argument shape ({ dataTable } / { docString })
            const argumentParameter =
                step.argument instanceof DataTable || typeof step.argument === 'string'
                    ? step.argument
                    : parseStepArgument(step.argument, {
                          dataTable: arg => new DataTable(arg),
                          docString: arg => arg.content
                      });
            parameters.push(argumentParameter);
        }
        return {
            parameters,
            validCodeLengths: [parameters.length, parameters.length + 1]
        };
    }

    matchesStepName(stepName) {
        return doesHaveValue(this.expression.match(stepName));
    }
}
