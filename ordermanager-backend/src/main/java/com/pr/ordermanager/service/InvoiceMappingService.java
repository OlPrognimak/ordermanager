package com.pr.ordermanager.service;


import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.jpa.entity.RateType;
import com.pr.ordermanager.repository.jpa.ItemCatalogRepository;
import com.pr.ordermanager.repository.jpa.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The helper class for mapping rest service model objects as source objects to
 * the entity as target object
 */
@Service
@Transactional
public class InvoiceMappingService {

     @Autowired
     private PersonRepository personRepository;
     @Autowired
     private ItemCatalogRepository itemCatalogRepository;

    /**
     * Maps rest service model object {@link InvoiceFormModel} to
     * the target entity object of class {@link Invoice}
     * @param invoiceFormModel the source object for mapping
     * @return the target object for mapping
     */
    public Invoice mapInvoiceModelToEntity(InvoiceFormModel invoiceFormModel){
        Optional<Person> supplierPerson = personRepository.findById(invoiceFormModel.getPersonSupplierId());
        Optional<Person> recipientPerson = personRepository.findById(invoiceFormModel.getPersonRecipientId());

        Invoice invoice = mapInvoiceFormModelToEntity(
            invoiceFormModel, supplierPerson.get(), recipientPerson.get());

        return invoice;

    }

    private  Invoice mapInvoiceFormModelToEntity(InvoiceFormModel invoiceFormModel,
            Person personInvoiceSupplier,
            Person personInvoiceRecipient){
            Invoice invoice = Invoice.builder()
                .invoiceDate(invoiceFormModel.getInvoiceDate())
                .invoiceNumber(invoiceFormModel.getInvoiceNumber())
                .invoiceDescription(invoiceFormModel.getInvoiceDescription())
                .creationDate(invoiceFormModel.getCreationDate())
                .rateType( RateType.valueOf(invoiceFormModel.getRateType()) )
                .invoiceSupplierPerson(personInvoiceSupplier)
                .invoiceRecipientPerson(personInvoiceRecipient)
                    .totalSumBrutto(invoiceFormModel.getTotalSumBrutto())
                    .totalSumNetto(invoiceFormModel.getTotalSumNetto())
                .build();
            invoice.setInvoiceItems(
                invoiceFormModel.getInvoiceItems()
                    .stream()
                    .map(i->ModelToEntityMapperHelper.mapInvoiceItemModelToEntity(
                         i, invoice, itemCatalogRepository.findById (
                             i.getCatalogItemId ()).orElseThrow()))
                            .collect( Collectors.toList())
            );
            personInvoiceSupplier.setInvoiceSuppliers( Arrays.asList(invoice));
            personInvoiceRecipient.setInvoiceRecipient(Arrays.asList(invoice));
            return invoice;

    }

}
