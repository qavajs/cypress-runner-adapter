Feature: step arguments

  Scenario: data table with special cells
    When I capture data table rows
      | key     | value        |
      | empty   |              |
      | pipe    | a \| b       |
      | unicode | огірок 🥒    |
      | newline | line1\nline2 |
    Then captured values should be:
      """json
      [[["empty", ""], ["pipe", "a | b"], ["unicode", "огірок 🥒"], ["newline", "line1\nline2"]]]
      """

  Scenario: doc string delimiters keep content and indentation
    When I capture doc string
      ```
      {
        "nested": "  indented"
      }
      ```
    Then last captured value should equal doc string:
      """
      {
        "nested": "  indented"
      }
      """

  Scenario: escaped doc string delimiter
    When I capture doc string
      """
      quote: \"\"\"
      """
    Then last captured value should equal doc string:
      ```
      quote: """
      ```

  Scenario: doc string with media type
    When I capture json doc string
      """json
      { "key": "value", "list": [1, 2] }
      """
    Then captured values should be:
      """json
      [{ "key": "value", "list": [1, 2] }]
      """

  Scenario: execute step with doc string argument
    When I execute 'I capture doc string' with doc string 'hello'
    Then captured values should be:
      """json
      ["hello"]
      """

  Scenario: execute step keeps step options
    When I execute step 'step with timeout'
    Then command timeout should be restored

  Scenario: named and data uri attachments
    When I attach named and data uri attachments
