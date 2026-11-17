Feature: scenario outline

  Background:
    Given I capture word background

  Scenario Outline: placeholders in step arguments <name>
    When I capture data table
      | name   | <name>   |
      | amount | <amount> |
    And I capture doc string
      """
      <name> costs <amount>
      """
    Then captured values should be:
      """json
      ["background", { "name": "<name>", "amount": "<amount>" }, "<name> costs <amount>"]
      """

    Examples:
      | name     | amount |
      | cucumber | 1      |
      | tomato   | 2      |

  Scenario Outline: examples tags <kind>
    Then example hook should have run: <ran>

    @exampleTag
    Examples: tagged
      | kind   | ran  |
      | tagged | true |

    Examples: untagged
      | kind     | ran   |
      | untagged | false |

  Scenario Outline: parameter types in outline <count>
    When I eat <count> <noun> for <meal>
    Then captured values should be:
      """json
      ["background", <count>]
      """

    Examples:
      | count | noun       | meal      |
      | 1     | cucumber   | breakfast |
      | 2     | cucumbers  | lunch     |
