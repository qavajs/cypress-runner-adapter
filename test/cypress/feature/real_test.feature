Feature: real test

  Scenario Outline: search in wikipedia <searchTerm>
    Given open 'https://en.wikipedia.org/' url
    When search '<searchTerm>'
    Then title should be '<searchTerm>'

    Examples:
      | searchTerm |
      | Cucumber   |
      | JavaScript |
      | TypeScript |

  Scenario Outline: search in wikipedia by template <searchTerm>
    When search in wikipedia '<searchTerm>'
    Then title should be '<searchTerm>'

    Examples:
      | searchTerm |
      | Cucumber   |
      | JavaScript |
      | TypeScript |
