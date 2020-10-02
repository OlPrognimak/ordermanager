# Short description
The project is created first of all  for the collecting of the useful features  on the frontend 
and backend parts on base of the real application. 
The next functionality will be planned:
 - creation of persons with addresses and bank accounts
 - create invoices with multiple items, goods and services
 - generate and printing out of the invoice in PDF format
 

# Backend frameworks
- SpringBoot-2 
- Lombok https://projectlombok.org/features/all. The useful frameworks which simplifying the development process of pojos like  entity and rest
  service model beans.
- OpenAPI/Swagger-UI  

# Backend configuration, features and useful tips 
- Security. 
   Currently uses BasicAuth. The security resources located in the package com.pr.ordermanager.security.
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

  
  

# Frontend frameworks and libraries
- Angular 10
- PrimeNG https://www.primefaces.org/primeng/
- Ag-Grid https://www.ag-grid.com/
- moment java script library: https://momentjs.com/. Here uses for formatting the date fields in domain objects.

# Frontend components
|Nr.|Component name|Description|
|---|:--------------|-----------|
|1|invoiceform| The page which contains ui-form for input data for invoice|
|2|personform|The page which contains the ui-form for input data for person|
|3|printinvoice|The page with table which contains the list of existed invoices in the database |
|4|user-registration| The page for the registration of a new user|
|5|validatable-input-text|The component which uses by another pages, forms or components. This input text shows error in case if length less as defined. Also this component user flowing labels. |
|6|validatable-dropdownlist|The component which uses by another pages, forms or components. ...|
|7|validatable-calendar|The component which uses by another pages, forms or components. ...|
|8|invoice-items-table|The component which uses by page invoiceform.|
 


# Fronend features and useful tricks and kicks
 - use components in development. Example of the component is a table for invoice items.
 - @Output. Example of using @Output for updating model in parent component. 
   Definition of event emmiter for output of object to parent component. See file *components.itemstable.ts* .  
 ```javascript
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
 ```
  The binding  of output event emmiter is located in the html template file invoiceform.component.html. 
  ```html
      <app-items-table (changeItemEvent)="itemsChanged($event)" ...
  ```
  The method *itemsChanged* accepts the emitted event with model data from the table of items.
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
      export class ComponentsPipesNumberDouble implements PipeTransform {
          ....
      }
  ```
  the usage of pipe in the html template components.itemstable.html
  
``` html
 <ng-template pTemplate="output">
             {{invoiceitem.amountItems | standardFloat}}
 </ng-template>
   
```





 
