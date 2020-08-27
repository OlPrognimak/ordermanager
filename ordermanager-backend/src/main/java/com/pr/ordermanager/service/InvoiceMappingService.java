package com.pr.ordermanager.service;


import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.repository.jpa.PersonRepository;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InvoiceMappingService {

     @Autowired
     private PersonRepository personRepository;


    public Invoice mapInvoiceModelToEntity(InvoiceFormModel invoiceFormModel){
        Optional<Person> supplierPerson = personRepository.findById(invoiceFormModel.getPersonSupplierId());
        Optional<Person> recipientPerson = personRepository.findById(invoiceFormModel.getPersonRecipientId());

        Invoice invoice = ModelToEntityMapperHelper.mapInvoiceFormModelToEntity(
            invoiceFormModel, supplierPerson.get(), recipientPerson.get());

        return invoice;

    }


}
