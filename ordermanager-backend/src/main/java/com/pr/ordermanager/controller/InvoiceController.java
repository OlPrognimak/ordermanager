package com.pr.ordermanager.controller;


import com.pr.ordermanager.controller.model.*;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.ItemCatalog;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.service.EntityToModelMapperHelper;
import com.pr.ordermanager.service.InvoiceMappingService;
import com.pr.ordermanager.service.InvoiceService;
import com.pr.ordermanager.service.ModelToEntityMapperHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.OK;


@RestController
@CrossOrigin
public class InvoiceController {

    private static final String PATH = "";
    private static final String PATH_INVOICE = PATH + "/invoice";
    private static final String PATH_INVOICES_LIST = PATH + "/invoicesList";
    private static final String PATH_PERSON = PATH + "/person";
    private static final String PATH_ITEM_CATALOG = PATH + "/itemcatalog";
    private static final String PATH_BANK_ACC = PATH + "/account";
    private static final String PATH_PERSONS_DROPDOWN = PATH + "/personsdropdown";
    private static final String PATH_ITEMSCATALOG_DROPDOWN = PATH + "/itemscatalogdropdown";
    private static final String APPLICATION_JSON = "application/json";
    @Autowired
    InvoiceService invoicePersonService;
    @Autowired
    InvoiceMappingService invoiceMappingService;
    @Autowired
    private Environment env;

    @RequestMapping(value = PATH_INVOICE, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewInvoice(@RequestBody InvoiceFormModel invoiceFormModel) {

        Invoice invoice = invoiceMappingService.mapInvoiceModelToEntity(invoiceFormModel);
        invoicePersonService.saveInvoice(invoice);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(invoice.getId()));
    }

    @RequestMapping(value = PATH_PERSON, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewPerson(@RequestBody PersonFormModel personFormModel) {

        Person person = ModelToEntityMapperHelper.mapPersonFormModelToEntity(personFormModel);
        invoicePersonService.savePerson(person);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(person.getId()));
    }

    /**
     *
     * @param idItemCatalog
     * @return
     */
    @GetMapping(value = PATH_ITEM_CATALOG+"/{idItemCatalog}", produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<ItemCatalogModel> getItemCatalog(
            @PathVariable() Long idItemCatalog){
        ItemCatalog itemCatalog = invoicePersonService.getItemCatalog(idItemCatalog);
        ItemCatalogModel itemCatalogModel = EntityToModelMapperHelper.mapEntityToItemCatalogModel(itemCatalog);
        return ResponseEntity.ok(itemCatalogModel);
    }

    public ResponseEntity<InvoiceFormModel> getInvoice(String invoiceNumber) {
        Invoice invoice = invoicePersonService.getInvoice(invoiceNumber);
        InvoiceFormModel invoiceFormModel = EntityToModelMapperHelper.mapInvoiceEntityToFormModel(invoice);

        return ResponseEntity.ok(invoiceFormModel);
    }

    @RequestMapping(value = PATH_PERSONS_DROPDOWN, method = RequestMethod.GET,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<List<DropdownDataType>> getPersonsDropdown() {
        List<Person> allPersons = invoicePersonService.getAllPersons();
        List<DropdownDataType> dropdownDataTypes =
                EntityToModelMapperHelper.mapPersonToDropdownType(allPersons);
        return ResponseEntity.status(OK).body(dropdownDataTypes);
    }

    @RequestMapping(value = PATH_ITEMSCATALOG_DROPDOWN, method = RequestMethod.GET,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<List<DropdownDataType>> getCatalogItemsDropdown() {
        List<ItemCatalog> allCatalogItems = invoicePersonService.getAllCatalogItems();
        List<DropdownDataType> dropdownDataTypes =
                EntityToModelMapperHelper.mapListCatalogItemsToDropdownType(allCatalogItems);
        return ResponseEntity.status(OK).body(dropdownDataTypes);
    }

    @RequestMapping(value = PATH_INVOICES_LIST, method = RequestMethod.GET,
            produces = APPLICATION_JSON)
    public ResponseEntity<List<InvoiceFormModel>> getInvoices(){
        List<Invoice> invoices = invoicePersonService.getInvoices();
        List<InvoiceFormModel> invoiceFormModels =
                invoices.stream().map(i ->
                        EntityToModelMapperHelper.mapInvoiceEntityToFormModel(i)).collect(Collectors.toList());
        return ResponseEntity.status(OK).body(invoiceFormModels);
    }

}
