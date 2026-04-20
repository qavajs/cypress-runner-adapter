import Definition from './definition';
import {PickleTagFilter} from './pickle_filter';

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
