Feature: step expressions

  Scenario: built-in parameter types
    When I capture int 42, float 3.14, word cucumber and string "double quoted"
    And I capture int -7, float -0.5, word огірок and string 'single quoted'
    Then captured values should be:
      """json
      [42, 3.14, "cucumber", "double quoted", -7, -0.5, "огірок", "single quoted"]
      """

  Scenario: empty string and anonymous parameter
    When I capture anonymous anything goes here and string ""
    Then captured values should be:
      """json
      ["anything goes here", ""]
      """

  Scenario: optional text and alternatives
    When I eat 1 cucumber for breakfast
    And I eat 3 cucumbers for lunch
    Then captured values should be:
      """json
      [1, 3]
      """

  Scenario: escaped parentheses
    When I capture escaped (literal) 5
    Then captured values should be:
      """json
      [5]
      """

  Scenario: regular expression capture groups use matching parameter types
    When I capture regexp 12-abc
    Then captured values should be:
      """json
      [12, "abc"]
      """

  Scenario: custom parameter type with multiple capture groups
    When I capture point (3, 4)
    Then captured values should be:
      """json
      [{ "x": 3, "y": 4 }]
      """

  Scenario: parameter type transformer is bound to world
    When modify value from world
    And I capture world.inWorld
    Then captured values should be:
      """json
      [true]
      """
