package com.pr.ordermanager.controller;


import com.pr.ordermanager.controller.model.GridDataModel;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.service.InvoicePersonService;
import com.pr.ordermanager.service.ModelToEntityMapper;
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

    private static final String PATH = "/invoicebackend";
    private static final String APPLICATION_JSON = "application/json";
    @Autowired
    private Environment env;
    @Autowired
    InvoicePersonService invoicePersonService;

    @RequestMapping(value = PATH, method = RequestMethod.PUT, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<String> putNewInvoice(@RequestBody InvoiceFormModel invoiceFormModel ){
        PersonInvoice personInvoice = ModelToEntityMapper.mapModelToEntityPersonInvoice(invoiceFormModel);
        invoicePersonService.savePersonInvoice(personInvoice);

        return ResponseEntity.status(CREATED).body("[successful]");
    }


    public ResponseEntity<InvoiceFormModel> getInvoice(String invoiceNumber){
        InvoiceData invoice = invoicePersonService.getInvoice(invoiceNumber);
        InvoiceFormModel invoiceFormModel = ModelToEntityMapper.mapEntityToFormModel(invoice.getPersonInvoice());

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
