Feature: real test

  Scenario Outline: search in wikipedia <searchTerm>
    Given open 'https://www.wikipedia.org/' url
    When search '<searchTerm>'
    Then title should be '<searchTerm>'

    Examples:
      | searchTerm |
      | Cucumber   |
      | JavaScript |
