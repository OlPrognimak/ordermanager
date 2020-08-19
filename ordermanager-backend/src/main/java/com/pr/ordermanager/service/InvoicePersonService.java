package com.pr.ordermanager.service;


import com.pr.ordermanager.controller.exception.OrderManagerException;
import com.pr.ordermanager.controller.model.GridDataModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.repository.jpa.InvoiceDataRepository;
import com.pr.ordermanager.repository.jpa.PersonInvoiceRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InvoicePersonService {
    @Autowired
    PersonInvoiceRepository personInvoiceRepository;
    @Autowired
    InvoiceDataRepository invoiceDataRepository;


    /**
     *
     * @param personInvoice the invoice to be saved
     * @exception OrderManagerException
     */
    public void savePersonInvoice(PersonInvoice personInvoice){

        if (validatePersonInvoice(personInvoice) ){
            try {
                personInvoiceRepository.save(personInvoice);

            }catch(Exception ex) {
                throw new OrderManagerException("Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException("The validation of PersonInvoice is failed.");
        }

    }


    /**
     *
     * @param invoiceData the invoice to be saved
     * @exception OrderManagerException
     */
    public String saveInvoiceData(InvoiceData invoiceData){
        String invoiceNumder=null;
        if (validateInvoiceData(invoiceData) ){
            try {
                invoiceDataRepository.save(invoiceData);
                invoiceNumder = invoiceData.getInvoiceNumber();
            }catch(Exception ex) {
                throw new OrderManagerException("Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException("The validation of PersonInvoice is failed.");
        }

        return invoiceNumder;
    }

    public InvoiceData getInvoice(String invoiceNumber){
        InvoiceData invoiceData = invoiceDataRepository.findByInvoiceNumber(invoiceNumber);
        return invoiceData;
    }

    private boolean validateInvoiceData(InvoiceData invoiceData){
        return true;
    }

    private boolean validatePersonInvoice(PersonInvoice personInvoice){
        return true;
    }

    public List<GridDataModel> getAllData() {
//        List<GridDataModelEntity> entities = dataGridRepository.findAll();
//        List<GridDataModel> dataModelList = entities.stream().parallel().map(m -> map(m)).collect(Collectors.toList());
//
//        return dataModelList;
        return null;

    }

}
