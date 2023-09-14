/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.invoice.service;


import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.entity.RateType;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The helper class for mapping rest service model objects as source objects to
 * the entity as target object
 *
 * @author Oleksandr Prognimak
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
     *
     */
    public void mapInvoiceModelToExistedEntity(InvoiceFormModel invoiceFormModel, Invoice invoice){

        if(invoice.getInvoiceSupplierPerson().getId() != invoiceFormModel.getPersonSupplierId()) {
            Optional<Person> supplierPerson = personRepository.findById(invoiceFormModel.getPersonSupplierId());
            invoice.setInvoiceSupplierPerson(supplierPerson.get());
            supplierPerson.get().setInvoiceSuppliers(List.of(invoice));
        }
        if(invoice.getInvoiceRecipientPerson().getId() != invoiceFormModel.getPersonSupplierId()) {
            Optional<Person> recipientPerson = personRepository.
                    findById(invoiceFormModel.getPersonRecipientId());
            invoice.setInvoiceRecipientPerson(recipientPerson.get());
            recipientPerson.get().setInvoiceRecipient(List.of(invoice));
        }

        invoice.setInvoiceDate(invoiceFormModel.getInvoiceDate());
        invoice.setInvoiceNumber(invoiceFormModel.getInvoiceNumber());
        invoice.setInvoiceDescription(invoiceFormModel.getInvoiceDescription());
        invoice.setCreationDate(invoiceFormModel.getCreationDate());
        invoice.setRateType( RateType.valueOf(invoiceFormModel.getRateType()));
        invoice.setTotalSumBrutto(invoiceFormModel.getTotalSumBrutto());
        invoice.setTotalSumNetto(invoiceFormModel.getTotalSumNetto());
        invoice.getInvoiceItems().clear();
        List<InvoiceItem> invoiceItems = invoiceFormModel.getInvoiceItems()
                .stream()
                .map(i -> mapInvoiceItemModelToEntity(
                        i, invoice, itemCatalogRepository.findById(
                                i.getCatalogItemId()).orElseThrow()))
                .collect(Collectors.toList());
        invoice.getInvoiceItems().addAll(invoiceItems);
    }

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
                    .map(i-> mapInvoiceItemModelToEntity(
                         i, invoice, itemCatalogRepository.findById (
                             i.getCatalogItemId ()).orElseThrow()))
                            .collect( Collectors.toList())
            );
            personInvoiceSupplier.setInvoiceSuppliers(List.of(invoice));
            personInvoiceRecipient.setInvoiceRecipient(List.of(invoice));
            return invoice;

    }

    public  InvoiceItem mapInvoiceItemModelToEntity(
            InvoiceItemModel invoiceFormModel, Invoice invoice, ItemCatalog itemCatalog){

        InvoiceItem invoiceItem = InvoiceItem.builder()
                .itemPrice(invoiceFormModel.getItemPrice())
                .amountItems(invoiceFormModel.getAmountItems())
                .itemCatalog(itemCatalog)
                .vat(invoiceFormModel.getVat())
                .sumNetto(invoiceFormModel.getSumNetto())
                .sumBrutto(invoiceFormModel.getSumBrutto())
                .invoice(invoice)
                .build();
        return invoiceItem;
    }

    /**
     * Maps the data from source Model object {@link ItemCatalogModel} to the entity  object {@link ItemCatalog}
     * @param source the source Entity object {@link InvoiceItem} with data for mapping to the target
     * @return the target entity object {@link ItemCatalog}
     */
    public  ItemCatalog mapModelToItemCatalogEntity(ItemCatalogModel source){
        return ItemCatalog.builder()
                .id(source.getId())
                .description(source.getDescription())
                .shortDescription(source.getShortDescription())
                .itemPrice(source.getItemPrice())
                .vat(source.getVat())
                .build();
    }

    /**
     * Maps data from model {@link ItemCatalogModel} to entity {@link ItemCatalog}
     *
     * @param model the model is data source for entity
     * @param entity the target object of mapping
     */
    public void mapItemCatalogModelToExistedEntity(
            ItemCatalogModel model, ItemCatalog entity) {
        entity.setDescription(model.getDescription());
        entity.setShortDescription(model.getShortDescription());
        entity.setItemPrice(model.getItemPrice());
        entity.setVat(model.getVat());
    }
}
