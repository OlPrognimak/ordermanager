
##### Table of contents
 [Overview](#Overview)
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

# Overview
This document mostly describes the code.
The user manual about usage of application is located 

The user manual for the application is located in the project path ```ordermanager/doc```.

# Start application in docker container
 - please go to folder ./docker and follow with description in README_DOCKER.md) file
 - 1\. create backend image with correspondent version
 - 2\. create frontend image with correspondent version  
 - 3\. run docker-compose (see ./docker/README_DOCKER.md)
# Short description
The project is primarily created to gather useful features for both the frontend 
and backend components based on a real application. The user manual for the application is located in the project path ```ordermanager/doc```. 
The next phase of functionality will be planned or already implemented:
 - create and save orders (currently not yet implemented)
 - creation of persons with addresses and bank accounts
 - create invoices with multiple items, goods and services
 - generate and printing out of the invoice in PDF format
 - create invoice by using workflow
 
# Backend
Maven module ```ordermanager-backend```.
 - The backend part is presented by the microcervice which is based on springboot framework verion 2.x.
 - The database can be different and depend on the configuration. Currently, uses Postges 10.x

## Backend frameworks
- SpringBoot-3 
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
               |    |_model 
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
UI-Framework Angular of version 16.
## Frontend frameworks and libraries
- Angular 16
- PrimeNG https://www.primefaces.org/primeng/
- Ag-Grid https://www.ag-grid.com/
- moment java script library: https://momentjs.com/. Here uses for formatting the date fields in domain objects.
## Project structure
- maven module **ordermanager-ui**. Contains springboot microservice for running generated web application. 
The pom.xml contains an  plugins for compilation and building angular application and packaging produced content to the war/jar file.
- **ordermanager-ui** contains a folder **ui** with angular project. 

## Frontend components
| Nr.  | Component name                 | Description                                                                                                                                                                                                                        |
|------|:-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1    | app                            | That is the root of the application and contains the home page with a navigation bar.                                                                                                                                              |
| 2    | app/invoice                    | That is the root folder for a invoice resources.                                                                                                                                                                                   |
| 2.1  | ./edit-invoice-dialog          | The modal dialog which is used for editing of already created invices. The dialog based on ```reactive-driven ``` form.                                                                                                            |
| 2.2  | ./edit-item-dialog             | This component provides modal dialog which uses for editing ```invoice catalog items```. Here is ```rective-driven ``` form.                                                                                                       |
| 2.3  | ./invoice-items-table          | This component provides table for incoice items and uses in the ```2.5 invoiceform``` component. The form based on ```templete-driven ``` form.                                                                                    |
| 2.4  | ./invoice-management           | That componen provides the form with lsit of created invoices which can be editet or deleted. The form based on ```templete-driven ``` form.                                                                                       |
| 2.5  | ./invoice-reactive-items-table | That component is used by the ```2.1 edit-invoice-dialog```. That component provides the table with invoice items which can be edited or deleted. Here is used  ```rective-driven ``` form.                                        |
| 2.5  | ./invoiceform                  | This is the component that contains a UI form for inputting data for an invoice. The form based on ```templete-driven ``` form.                                                                                                    |
| 2.7  | ./item-management              | The component for management with catalog items (That are invoice items or articles). Provides the table with all or filtered invoice items.                                                                                       |
| 2.8  | ./items-form                   | That component provides input form catalog item for invoice.                                                                                                                                                                       |
| 2.9  | ./printinvoice                 | This is a component with the table which contains the list of existed invoices in the database.`This table uses component ``ag-Grid`` (angular). Each row in table contains button for download invoice in PDF format from server. |
| 2.10 | ./table-cell-renderer          | That component renders a button for dowloading invoice in PDF report.                                                                                                                                                              |
| 3    | app/person                     | Contain components for creation, editins and deleting persons.                                                                                                                                                                     |
| 3.1  | ./edit-person-dialog           | The modal dialog for editing selected person. That component is used in ```3.2 person-management```.                                                                                                                               |
| 3.2  | ./person-management            | That component is used for the management with created persons.                                                                                                                                                                    |
| 3.3  | ./personform                   | This is a component which contains an ui-form with input controls for creating a new person.                                                                                                                                       |
| 4    | app/user                       | Contains components for creation user and login.                                                                                                                                                                                   |
| 4.1  | ./user-login                   | User login component to login to the ordermanagement application                                                                                                                                                                   |
| 4.2  | ./user-registration            | The component with a form for registration of a new user                                                                                                                                                                           |
| 5    | app/common-components          | Contains components which uses by another components.                                                                                                                                                                              |
| 5.1  | ./attributes                   | That is directive which add attribues dynamically to html elements.                                                                                                                                                                |
| 5.2  | ./confirmation-dialog          | The confirmation dialog with Yes and Cancel buttons.                                                                                                                                                                               |
| 5.3  | ./dateperiod-finder            | This component is used by another components to search and return the objects from server.                                                                                                                                         |
| 5.4  | ./editable-input-cell          | The editable cell which can be used in table cells.                                                                                                                                                                                |
| 5.5  | ./templates-component          | Contains set of templates (inputbox, combobox, date picker,...) which can be used in another components by reference like ```  <ng-container *ngTemplateOutlet="templatesComponent.inputNumberTemplate; ...```                     |
| 5.6  | ./validatable-calendar         | The calendar picker component which shows error in case if date is not selected or incorrect inserted.                                                                                                                             |
| 5.7  | ./validatable-dropdownlist     | The dropdown list component which shows error in case if item in dropdown list is not selected.                                                                                                                                    |
| 5.8  | ./validatable-input-number     | The input control which accepts onlny numbers and shows error in case if the value is not entered.                                                                                                                                 |
| 5.9  | ./validatable-input-text       | The component which uses by another components. This input text shows error in case if length less as defined. Also this component user flowing labels.                                                                            |
| 6    | app/common-services            | Contains common resources like utility classes, pipes, services.                                                                                                                                                                   |
| 7    | app/workflow                   | Contains workflow components.                                                                                                                                                                                                      | 
| 7.1  | ./invoice-workflow             | The workflow for creation of invoice.                                                                                                                                                                                              |
## Frontend features and useful tips
- ```Signals```
Example of usage the signal you can find in the service class ```InvoiceItemsTableCalculatorService```

```typescript
export class InvoiceItemsTableCalculatorService {

    totalNettoSum: WritableSignal<number> = signal(0);
    totalBruttoSum: WritableSignal<number> =  signal(0);
    
```

The signals is used here for calculating of totals amount in invoice.

- ```Observable with pipe() and map()```
There is async method:
```typescript
public async calculateAllSum(invoiceItems: InvoiceItemModel[], modelItem: InvoiceItemModel): Promise<void> {

    const numberPromise = of(new CalculatorParameters(invoiceItems, modelItem))
        /* 1 Calculate netto sum for setected item row*/
        .pipe(map(data =>this.calculateNettoSum(data)))
        /* 2 Calculate brutto sum for selected item row.*/
        .pipe(map(data => this.calculateBruttoSum(data)))
        /* 3 Calculates total netto sum.*/
        .pipe(map(data => this.calculateTotalNettoSum(data)))
        /* 4 Calculate total brutto sum.*/
        .pipe(map(data => this.calculateTotalBruttoSum(data)))
    numberPromise.subscribe();

    await numberPromise;
}
```
This method is called when adding/deleting an item to the invoice. Subsequently, the method calculates the net (netto) and gross (brutto) sums of the newly added item in pipes 1 and 2. 
It then computes the total net (netto) and gross (brutto) values for the entire invoice in pipes 3 and 4.
In cass of deleting of item will be recalculate the totals in pipes 3 and 4.

- Example of predefined html templates over ```TemplateRef<>```and usage it in ```<ng-container *ngTemplateOutlet =""/>```
  The advantage of using predefined templates is the ability to apply these templates within other HTML templates by supplying context-specific parameters as needed.
In project is the component  ```templates-component``` which collect the several of templates for example the template ```#inputNumberTemplate```
  - 1)Look at definition of that template in the file *templates-component.component.html*
```html
<ng-template #inputNumberTemplate let-controlPath="controlPath" let-idComponent="idComponent" let-labelText="labelText">
    <div style="display: table; width: 100%;">
        <div style="display: table-row; width: 100%;">
            <div style="display: table-cell; width: 100%;">
               <span class="p-float-label">
                    <p-inputNumber [formControl]="getControl(controlPath)" [maxFractionDigits]="2"
                                   [minFractionDigits]="2"
                                   class="ng-dirty p-mr-2"
                                   class="p-cell-editing ng-dirty"
                                   id="{{idComponent}}"
                                   mode="decimal"
                                   placeholder='0.00'/>
                  <label for="{{idComponent}}">{{labelText}}</label>
               </span>
            </div>
            <div *ngIf="getControl(controlPath)?.invalid" style="display: table-cell; width: 10%;">
                <p-message severity="error"></p-message>
            </div>
        </div>
    </div>
</ng-template>
```
  - 2)Look at definition of that template reference in the file *templates-component.component.ts*
```typescript
@ViewChild('inputNumberTemplate', {static: true}) inputNumberTemplate: TemplateRef<InputTextTemplateContext>;
```
  - 3)Look at the usage of the defined reference above in another component ```edit-item-dialog``` in the file *edit-item-dialog.component.html*

```html
 <ng-container *ngTemplateOutlet="templatesComponent.inputNumberTemplate;
        context:{controlPath: 'itemPrice',
        idComponent: 'id_ItemPrice',
        labelText: 'Item price'}">
        </ng-container>
```

 - ``` @Output ```. 
Example of using ``` @Output ``` for updating the model in a parent component. 
   Example of using ``` @EventEmitter ``` for output of an object to parent component. See the class ```InvoiceItemsTableComponent``` 
   file *invoice-items-table.itemstable.ts* .  
   
 ```javascript
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
 ```
  In our case the Emitter emits event when new item is added or removed from table model.
  See ```addNewItem()``` and ```deleteItem(idxItem: any)``` in the same class.

Here's an example of binding an output event emitter to the parent component in the HTML template file *invoiceform.component.html*.
Here  ``` app-items-table ``` is child component. 
```html
      <app-items-table (changeItemEvent)="itemsChanged($event)" ...
  ```
  The method *itemsChanged* receives the emitted event with model data from the child component (table of items).
  This method updates the invoice model with data from the child components.
  Please refer to the *invoiceform.component.ts* file for more details.
  ```typescript
    /** The invoice data model*/
      invoiceFormData: InvoiceFormModelInterface;
           
      /**
         * In case if items in table was deleted or added to the model
         * @param invoiceItems the new state of the items
         */
        itemsChanged(invoiceItems: InvoiceItemModel[]): any{
          this.invoiceFormData.invoiceItems = invoiceItems;
        }
       
       
  ```
 - @Pipe . Example for formatting numbers in a table of items.
   The definition is located in the file *components.pipes.number.ts*.
 ```typescript
      @Pipe({
        name: 'standardFloat'
      })
      export class CommonServicesPipesNumberDouble implements PipeTransform {
          ....
      }
  ```
  the usage of pipe in the html template *components.itemstable.html*
  
``` html
 <ng-template pTemplate="output">
             {{invoiceitem.amountItems | standardFloat}}
 </ng-template>
   
```
- EventBus. Implementation and usage of the event bus like GWT event bus
The implementation of located in the class ```CommonServiceEventBus<T>``` of the file *common-service.event.bus.ts*
  - The Usage. Here we consider then case of emitting an error message in one component and than print this message in another component.
  
*Step1* place the event bus in place where will emit event and subscribe message emitting. In Our case we consider the case when occurs an error when we try to delete the person which already somewhere already uses.
   Check the function : ```CommonServiceEventBus<T>.putObjectToServer```

  ```typescript
    let eventBusObservable
    if(environment.debugMode) {
      eventBusObservable = of(this.eventBus).pipe(takeUntil(this.notifier))
    }
  
     .......
  
      if(environment.debugMode) {
          eventBusObservable.subscribe(eb => eb.emitEvent(err))
        }
  ```

*Step2* subscribe the event listener in a component where will be listened an error. In our case we will listen an error at the ```PersonManagementComponent```

```typescript
 ngOnInit(): void {
    if (environment.debugMode) {
      this.eventListener.onEvent().subscribe(val =>{
        this.eventBusVal= JSON.stringify(val)
      });
    }
```

*Step3* print error message in HTML template in debug mode. In our case we print the error message in template *tsperson-management.component.html*
````html
  <div class="p-col-12" *ngIf="environment.debugMode">
    <p>
        Error Message: {{eventBusVal}}
    </p>
  </div>
````


- Download and open PDF  
Example of usage is located in the class ```TableCellRendererComponent``` which is defined in the ts file 
``` html

```

# PDF Documents
- PDF document for printing of invoices and other documents based on JasperReport. 
- As a design tool for the layout I can recommend the "TIBCO Jaspersoft" Studio: https://community.jaspersoft.com/project/jaspersoft-studio

## Invoice pdf
The Invoices in PDF format generates from the data which is saved in the database with using **invoiceform** component and
printed out bei using **printinvoice** component.





 
