Feature: real test

  Scenario Outline: search <searchTerm>
    Given open 'test/fixtures/search.html' url
    When search '<searchTerm>'
    Then title should be '<searchTerm>'

    Examples:
      | searchTerm |
      | Cucumber   |
      | JavaScript |
      | TypeScript |

  Scenario Outline: search by template <searchTerm>
    When search in catalog '<searchTerm>'
    Then title should be '<searchTerm>'

    Examples:
      | searchTerm |
      | Cucumber   |
      | JavaScript |
      | TypeScript |
