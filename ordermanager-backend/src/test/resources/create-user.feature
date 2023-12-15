Feature: Testing a User REST API
  User creates the login user
  Scenario: Create new user login
    Given user fills UI form with user name 'test' and password 'test123'

    When  user click save button 'Send'

    Then  the backend response with user id and HTTP status status '200'