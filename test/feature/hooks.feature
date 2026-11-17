@featureTag
Feature: hooks and tags

  Scenario: feature tags are inherited by scenarios
    Then hook for tag expression '@featureTag' should have run

  @hookA
  Scenario: tag expression with not matches
    Then hook for tag expression '@hookA and not @hookB' should have run

  @hookA @hookB
  Scenario: tag expression with not excludes
    Then hook for tag expression '@hookA and not @hookB' should not have run

  @hookOr2
  Scenario: tag expression with or
    Then hook for tag expression '@hookOr1 or @hookOr2' should have run

  @order
  Scenario: hooks run in order and share world
    Given I record 'first'
    When I record 'second'
    Then recorded order should be:
      | Before 1                              |
      | Before 2                              |
      | BeforeStep: I record 'first'          |
      | step: first                           |
      | AfterStep: I record 'first'           |
      | BeforeStep: I record 'second'         |
      | step: second                          |
      | AfterStep: I record 'second'          |
      | BeforeStep: recorded order should be: |

  Scenario: world is created for each scenario - modify
    When modify value from world
    Then value from world should be true

  Scenario: world is created for each scenario - check
    Then value from world should be false

  @skip(not_implemented)
  Scenario: skipped with reason
    When fail

  @defaultCommandTimeout(1500) @scrollBehavior(false)
  Scenario: config tags with parsed values
    Then cypress config defaultCommandTimeout should be 1500
    And cypress config scrollBehavior should be false

  @ruleTag
  Rule: tagged rule

    Scenario: rule tags are inherited by scenarios
      Then hook for tag expression '@ruleTag' should have run
      And hook for tag expression '@featureTag' should have run
