@tag123
Feature: test feature

  Background:
    Given simple step

  Scenario: data table
    Given data table step
      | 1 |
      | 2 |

  @tagged
  Scenario: multiline
    Given multiline step
    """
    first
    second
    """

  Scenario: log
    Given log
    Given simple step

  Scenario: duplicate
    Given log

  Scenario: duplicate
    Given log
