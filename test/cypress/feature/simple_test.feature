@tag123
Feature: test feature

  Background:
    Given simple step

  Scenario: data table
    Given data table step
      | 1 |
      | 2 |
      | 3 |

  @tagged
  Scenario: multiline
    Given multiline step
    """
    first
    second
    """

  @tagged
  Scenario: log
    Given log
    When simple step
    Then simple step

  Scenario: duplicate
    Given log

  Scenario: duplicate
    Given log

  Scenario: world
    When modify value from world
    Then check value from world

  Scenario: parameter type
    When print blue

  Scenario: skipped steps
    When simple step
    #When fail
    When simple step
    When simple step
    When simple step
    When simple step

  Scenario: execute step
    When execute step
