package com.pr.ordermanager.controller;


import com.pr.ordermanager.controller.model.GridDataModel;
import com.pr.ordermanager.controller.model.CreatedResponse;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.controller.model.PersonFormModel;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.service.EntityToModelMapperHelper;
import com.pr.ordermanager.service.InvoiceMappingService;
import com.pr.ordermanager.service.InvoiceService;
import com.pr.ordermanager.service.ModelToEntityMapperHelper;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.http.HttpStatus.CREATED;


@RestController
@CrossOrigin
public class InvoiceController {

    private static final String PATH = "";
    private static final String PATH_INVOICE = PATH+"/invoice";
    private static final String PATH_PERSON = PATH+"/person";
    private static final String PATH_ADDRESS = PATH+"/address";
    private static final String PATH_BANK_ACC = PATH+"/account";
    private static final String APPLICATION_JSON = "application/json";
    @Autowired
    private Environment env;
    @Autowired
    InvoiceService invoicePersonService;
    @Autowired
    InvoiceMappingService invoiceMappingService;


    @RequestMapping(value = PATH_INVOICE, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewInvoice(@RequestBody InvoiceFormModel invoiceFormModel ){

        Invoice invoice = invoiceMappingService.mapInvoiceModelToEntity(invoiceFormModel);
        invoicePersonService.saveInvoice(invoice);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(invoice.getId()));
    }

    @RequestMapping(value = PATH_PERSON, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewPerson(@RequestBody PersonFormModel personFormModel ){

        Person person = ModelToEntityMapperHelper.mapPersonFormModelToEntity(personFormModel);
        invoicePersonService.savePerson(person);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(person.getId()));
    }


    public ResponseEntity<InvoiceFormModel> getInvoice(String invoiceNumber){
        Invoice invoice = invoicePersonService.getInvoice(invoiceNumber);
        InvoiceFormModel invoiceFormModel = EntityToModelMapperHelper.mapInvoiceEntityToFormModel(invoice);

        return ResponseEntity.ok(invoiceFormModel);
    }

    @RequestMapping(value = PATH, method = RequestMethod.GET, produces = APPLICATION_JSON)
    public ResponseEntity<List<GridDataModel>> getGridDataModel(){
//        List<GridDataModel> gridDataModels = dataGridService.getAllData();
//        ResponseEntity<List<GridDataModel>> responseEntity = ResponseEntity.ok().body(gridDataModels);
//        return responseEntity;
        return null;
    }



}
