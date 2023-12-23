Feature: Testing a REST API
  Users should be able to Create, Update and Delete Invoice
  Scenario: Create Invoice
    Given there are two invoice catalog item
          |description                      | shortDescription| itemPrice| vat   |
          |Test item1  desc                 | Test item1      | 100.00   | 19 |
          |Test item2 shortDescription 2222.| Item 2222        | 200.00   | 19 |
    And there is a person invoice creator
          | personLastName | personFirstName | companyName | taxNumber | email              | personType |
          | Prognimak      |  Oleksandr      |             |  11111111 |  oleksandr@test.de | PRIVATE    |
    And invoice creator has an address
          |   city | street         | zipCode | postBoxCode |
          | Bonn   | Bonner str. 55 | 51333   |             |
    And invoice creator has a bank account
          | accountNumber | iban                   | bicSwift  | bankName    |
          | 1111111111    | DE92 3333 1111 1111 11 | COX32DXXX | Bonner Bank |
    And there is a person invoice recipient
        | personLastName | personFirstName | companyName  | taxNumber   | email           | personType |
        |                |                 | Test Company |  2222222222 |  compny@test.de | ORGANISATION |
    And invoice recipient has an address
        | city    | street             | zipCode | postBoxCode |
        | München | Münchener Str. 122 | 98777   | 98776       |
    And invoice recipient has a bank account
        | accountNumber | iban                   | bicSwift  | bankName       |
        | 2222222222    | DE92 3333 2222 2222 22 | CCC18DABC | Münchener Bank |
    Given user fills invoice fields in form
        |invoiceNumber|invoiceDescription|totalSumNetto|totalSumBrutto|creationDate|invoiceDate|rateType|
        |1234567890|Invoice Description|300.0|357.0|2023-11-25T15:00:00+01:00|2023-11-25T15:00:00+01:00|HOURLY|
    And select creator and recipient persons
    And fills invoice items 'Test item1' with 1.0 amount and 'Item 2222' with 1.0 amount
    And creates user 'userName' and password 'password' and JWT token
    When user click save button
    Then the server should have 1 invoice in the database and return http status 201