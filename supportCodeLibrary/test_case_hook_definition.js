import Definition from './definition';
import { PickleTagFilter } from './pickle_filter';

export default class TestCaseHookDefinition extends Definition {

    constructor(data) {
        super(data)
        this.name = data.options.name ?? 'Hook'
        this.tagExpression = data.options.tags
        this.pickleTagFilter = new PickleTagFilter(data.options.tags)
    }

    appliesToTestCase(pickle) {
        return this.pickleTagFilter.matchesAllTagExpressions(pickle)
    }
}
