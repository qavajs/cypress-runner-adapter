import {doesHaveValue, doesNotHaveValue} from './value_checker';
import parse from '@cucumber/tag-expressions';

export class PickleTagFilter {
    constructor(tagExpression) {
        if (doesHaveValue(tagExpression) && tagExpression !== '') {
            this.tagExpressionNode = parse(tagExpression)
        }
    }

    matchesAllTagExpressions(pickle) {
        if (doesNotHaveValue(this.tagExpressionNode)) {
            return true
        }
        return this.tagExpressionNode.evaluate(pickle.tags.map((x) => x.name))
    }
}
