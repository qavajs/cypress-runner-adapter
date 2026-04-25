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
    When simple step
    When simple step
    When simple step
    When simple step

  Scenario: execute step
    When execute step

  Scenario Outline: print <value>
    When print <value>

    Examples:
      | value |
      | blue  |
      | red   |
      | green |

  Scenario: template
    When template step

  Scenario: world log
    When world log '42'

  Scenario: and but keywords
    Given simple step
    And simple step
    But simple step

  Scenario: data table hashes
    Given data table hashes step
      | name   | value |
      | first  | one   |
      | second | two   |

  Scenario: data table rows hash
    Given data table rows hash step
      | first  | one |
      | second | two |

  Scenario: data table rows
    Given data table rows step
      | col1   | col2   |
      | value1 | value2 |
      | value3 | value4 |

  Scenario: data table transpose
    Given data table transpose step
      | a | b | c |
      | 1 | 2 | 3 |

  Scenario: attach and link
    When attach value
    When link value