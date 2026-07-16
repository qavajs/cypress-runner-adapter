import Definition from './definition.js';
import { PickleTagFilter } from './pickle_filter.js';

export default class TestStepHookDefinition extends Definition {
    constructor(data) {
        super(data)
        this.tagExpression = data.options.tags
        this.pickleTagFilter = new PickleTagFilter(data.options.tags)
    }

    appliesToTestCase(pickle) {
        return this.pickleTagFilter.matchesAllTagExpressions(pickle)
    }
}
