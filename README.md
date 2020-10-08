##### Table of contents
 1. [Short description](#Short-description)
 2. [Backend](#Backend)
    - [Backend frameworks](#Backend-frameworks)
    - [Packages structure](#Packages-structure)
    - [Tests](#Tests)
    - [Backend configuration features and useful tips](#Backend-configuration-features-and-useful-tips)
 
 3. [Frontend](#Frontend)
    - [Frontend frameworks and libraries](#Frontend-frameworks-and-libraries)
    - [Frontend components](#Frontend-components)
    - [Fronend features and useful tips](#Fronend-features-and-useful-tips)
 
 4. [PDF Documents](#PDF-Documents)
    - [Invoice pdf](#Invoice-pdf)

# Start application in docker container
 - please go to folder ./docker and follow with description in README_DOCKER.md) file
 - 1\. create backend image with correspondent version
 - 2\. create frontend image with correspondent version  
 - 3\. run docker-compose (see ./docker/README_DOCKER.md)
# Short description
The project is created first of all  for the collecting of the useful features  on the frontend 
and backend parts on base of the real application. 
The next functionality will be planned:
 - create and save orders (currently not yet implemented)
 - creation of persons with addresses and bank accounts
 - create invoices with multiple items, goods and services
 - generate and printing out of the invoice in PDF format
 
# Backend
Maven module ```ordermanager-backend```.
 - The backend part is presented by the microcervice which is based on springboot framework verion 2.x.
 - The database can be different and depend on the configuration. Currently, uses Postges 10.x

## Backend frameworks
- SpringBoot-2 
- Lombok https://projectlombok.org/features/all. The useful frameworks which simplifying the development process of pojos like  entity and rest
  service model beans.
- OpenAPI/Swagger-UI
## Packages structure
```diff
   com
    |_pr
       |_ordermanager
               |_common
               |    |_entity
               |    |_model
               |_exception
               |_invoice
               |    |_controller
               |    |_entity
               |    |_model
               |    |_repository
               |    |_service
               |_person
               |    |_controller
               |    |_entity
               |    |_model
               |    |_repository
               |    |_service
               |_report
               |    |_controller
               |    |_service
               |_security
               |    |_controller
               |    |_entity
               |    |_repository
               |    |_service 
               |_utils 
```
## Tests
 * JUnit-5
 * Mockito
 * SpringBoot Test  
 * H2 Data in memory database for testing components which uses database. 

## Backend configuration features and useful tips 
- Security. 
   Currently, uses BasicAuth. The security resources located in the package com.pr.ordermanager.security.
     The implementation of security contains:
    * security configuration ```java com.pr.ordermanager.security.controller.SecurityConfig```
    * the database table InvoceUser 
    * the service UserService 
    * JPARepository UserRepository  
    * Rest Controller  InvoiceUserController
- OpenAPI/Sagger-UI URLs
  * OpenAPI documentation in JSON format: http://localhost:8083/backend/v3/api-docs/
  * OpenAPI documentation in YAML format: http://localhost:8083/backend/v3/api-docs.yaml
  * Swagger-UI: http://localhost:8083/backend/swagger-ui.html
 
# Frontend
The frontend application has implemented with using springboot framework as a runner of web application and
UI-Framework Angular of version 10.
## Frontend frameworks and libraries
- Angular 10
- PrimeNG https://www.primefaces.org/primeng/
- Ag-Grid https://www.ag-grid.com/
- moment java script library: https://momentjs.com/. Here uses for formatting the date fields in domain objects.
## Project structure
- maven module **ordermanager-ui**. Contains springboot microservice for running generated web application. 
The pom.xml contains an  plugins for compilation and building angular application and packaging produced content to the war/jar file.
- **ordermanager-ui** contains a folder **ui** with angular project. 

## Frontend components
|Nr.|Component name|Description|
|---|:--------------|-----------|
|1|app| That is a root of the application and contains the home page with navigation bar. |
|2|app/invoiceform| This is a component which contains an ui-form for input data for invoice.|
|3|app/personform|This is a component which contains an ui-form for input data for person|
|4|app/printinvoice|This is a component with the table which contains the list of existed invoices in the database.`This table uses component ``ag-Grid`` (angular). Each row in table contains button for download invoice in PDF format from server.  |
|5|app/table-cell-renderer| This is a cell with button for for download invoice in PDF Format. Uses by ``ag-Grid`` in component (4).    
|6|app/user-login|User login page to login to the invoice management application|
|7|app/user-registration| The component with a form for registration of a new user|
|8|app/validatable-input-text|The component which uses by another components. This input text shows error in case if length less as defined. Also this component user flowing labels. |
|9|app/validatable-dropdownlist|The component which uses by another components. This dropdown list shows error if item is not selected.|
|10|app/validatable-calendar|The component which uses by another pages, forms or components. The calendar which shows error in case if date is not selected.|
|11|app/invoice-items-table|The component which uses by page invoiceform(2) and contains invoice items. This table uses ```PrimeNG``` component ``Table``.  The user can add or remove items there, change price, amount and var% of item. Also there will be calculated netto and brutto price of item and total netto and brutto price of whole invoice. |
|12|app/common-services|contains (or will contain) common resources like utility classes, pipes, services|
|13|app/item-form|contains form for creation new inviuce item and saving on to the databse on server| 
## Fronend features and useful tips
 - ``` @Output ```. Example of using ``` @Output ``` for updating model in parent component. 
   Example of using ``` @EventEmitter ``` for output of object to parent component. See the class ```InvoiceItemsTableComponent``` 
   file *invoice-items-table.itemstable.ts* .  
   
 ```javascript
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
 ```
  In our case the Emitter emits event when new item is added or removed from table model.
  See ```addNewItem()``` and ```deleteItem(idxItem: any)``` in the same class.
  
  The example of binding  of output event emitter to the parent component is located in the html template file invoiceform.component.html. 
  Here  ``` app-items-table ``` is child component. 
```html
      <app-items-table (changeItemEvent)="itemsChanged($event)" ...
  ```
  The method *itemsChanged* accepts the emitted event with model data from the child component( table of items).
  This method replaces the invoice model with data from child components.
  See the component file *invoiceform.component.ts*
  ```javascript
    /** The invoice data model*/
      invoiceFormData: InvoiceFormModelInterface;
           .......
      /**
         * In case if items in table was deleted or added to the model
         * @param invoiceItems the new state of the items
         */
        itemsChanged(invoiceItems: InvoiceItemModel[]): any{
          this.invoiceFormData.invoiceItems = invoiceItems;
        }
       ......
       
  ```
 - @Pipe . Example for formatting numbers in a table of items.
  the definition is located in file components.pipes.number.ts
 ```java
      @Pipe({
        name: 'standardFloat'
      })
      export class CommonServicesPipesNumberDouble implements PipeTransform {
          ....
      }
  ```
  the usage of pipe in the html template components.itemstable.html
  
``` html
 <ng-template pTemplate="output">
             {{invoiceitem.amountItems | standardFloat}}
 </ng-template>
   
```
- Download and open PDF  
Example of usage is located in the class ```TableCellRendererComponent``` which is defined in the ts file 
``` html

```
 

# PDF Documents
- PDF document for printing invoices and other documents based on JasperReport. 
- As a design tool for the layout I can recommend the "TIBCO Jaspersoft" Studio: https://community.jaspersoft.com/project/jaspersoft-studio

## Invoice pdf
The Invoices in PDF format generates from the data which is saved in the database with using **invoiceform** component and
printed out bei using **printinvoice** component.





 
