import Definition from './definition';
import { PickleTagFilter } from './pickle_filter';

export default class TestCaseHookDefinition extends Definition {

    constructor(data) {
        super(data)
        this.name = data.options.name
        this.tagExpression = data.options.tags
        this.pickleTagFilter = new PickleTagFilter(data.options.tags)
    }

    appliesToTestCase(pickle) {
        return this.pickleTagFilter.matchesAllTagExpressions(pickle)
    }

    async getInvocationParameters({ hookParameter }) {
        return {
            getInvalidCodeLengthMessage: () =>
                this.buildInvalidCodeLengthMessage('0 or 1', '2'),
            parameters: [hookParameter],
            validCodeLengths: [0, 1, 2],
        }
    }
}
