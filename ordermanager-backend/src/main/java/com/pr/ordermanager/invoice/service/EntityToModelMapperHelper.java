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

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.model.BankAccountFormModel;
import com.pr.ordermanager.person.model.PersonAddressFormModel;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.utils.Utils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * The mapping helper for mapping JPA Entity to Rest Model POJO object
 *
 * @author Oleksandr Prognimak
 */
public class EntityToModelMapperHelper {

    private EntityToModelMapperHelper(){

    }

    public static PersonFormModel mapPersonEntityToFormModel(Person person){
        return PersonFormModel.builder()
            .personFirstName(person.getPersonFirstName())
            .personLastName(person.getPersonLastName())
            .personType(person.getPersonType().name())
            .taxNumber(person.getTaxNumber())
            .build();
    }


    public static PersonAddressFormModel mapPersonAddressEntityToFormModel(PersonAddress personAddress){
        return PersonAddressFormModel.builder()
            .city(personAddress.getCity())
            .id(personAddress.getId())
            .postBoxCode(personAddress.getPostBoxCode())
            .street(personAddress.getStreet())
            .zipCode(personAddress.getZipCode())
            .build();
    }


    public static BankAccountFormModel mapPersonBankAccountEntityToFormModel(BankAccount bankAccount){
        return BankAccountFormModel.builder()
            .id(bankAccount.getId())
            .accountNumber(bankAccount.getAccountNumber())
            .bankName(bankAccount.getBankName())
            .bicSwift(bankAccount.getBicSwift())
            .iban(bankAccount.getIban()).build();
    }

    /**
     * Maps {@code invoice} {@link Invoice} to {@link InvoiceFormModel}
     * @param invoice the invoice entity
     * @return the invoice model
     */
    public static InvoiceFormModel mapInvoiceEntityToFormModel(Invoice invoice){
        InvoiceFormModel invoiceFormModel = InvoiceFormModel.builder()
            .personRecipientId(
                    invoice.getInvoiceRecipientPerson().getId())
             .recipientFullName(
                     (Utils.emptyOrValue(invoice.getInvoiceRecipientPerson().getPersonFirstName())+" "+
                             Utils.emptyOrValue(invoice.getInvoiceRecipientPerson().getPersonLastName())+ " "+
                             Utils.emptyOrValue(invoice.getInvoiceRecipientPerson().getCompanyName())
                     ).trim()
             )
            .invoiceNumber(invoice.getInvoiceNumber())
            .invoiceDescription(invoice.getInvoiceDescription())
            .invoiceDate(invoice.getInvoiceDate())
            .creationDate(invoice.getCreationDate())
            .rateType(invoice.getRateType().name())
            .personSupplierId(invoice.getInvoiceSupplierPerson().getId())
                .supplierFullName(
                        (Utils.emptyOrValue(invoice.getInvoiceSupplierPerson().getPersonFirstName())+" "+
                                Utils.emptyOrValue(invoice.getInvoiceSupplierPerson().getPersonLastName())+ " "+
                                Utils.emptyOrValue(invoice.getInvoiceSupplierPerson().getCompanyName())).trim())
             .totalSumBrutto(invoice.getTotalSumBrutto())
                .totalSumNetto(invoice.getTotalSumNetto())
             .invoiceItems(
                invoice.getInvoiceItems()
                    .stream()
                    .map(i->mapEntityToModelInvoiceItem(i)).collect(Collectors.toList())
            ).build();
        return invoiceFormModel;
    }

    public static InvoiceItemModel mapEntityToModelInvoiceItem(InvoiceItem invoiceItem){
        return InvoiceItemModel.builder()
                .catalogItemId (invoiceItem.getItemCatalog().getId())
                .itemPrice(invoiceItem.getItemPrice())
                .description(invoiceItem.getItemCatalog().getDescription())
                .amountItems(invoiceItem.getAmountItems())
                .vat(invoiceItem.getVat())
                .sumNetto(invoiceItem.getSumNetto())
                .sumBrutto(invoiceItem.getSumBrutto())
                .build();
    }

    public static List<DropdownDataType> mapPersonToDropdownType(List<Person> persons){
        return persons.stream().map(p->new DropdownDataType(
                Utils.emptyOrValue(p.getPersonFirstName())+ " "+
                        Utils.emptyOrValue(p.getPersonLastName())+ " "+
                        Utils.emptyOrValue(p.getCompanyName()).trim(),
                ""+p.getId())).collect(Collectors.toList());
    }

    public static List<DropdownDataType> mapListCatalogItemsToDropdownType(List<ItemCatalog> itemCatalogs){
        return itemCatalogs.stream().map(c->new DropdownDataType(
                c.getShortDescription()+ " : Price :"+c.getItemPrice()+ " " ,
                ""+c.getId())).collect(Collectors.toList());
    }


    public static ItemCatalogModel mapEntityToItemCatalogModel(ItemCatalog itemCatalog){
        return ItemCatalogModel.builder()
                .id(itemCatalog.getId())
                .description(itemCatalog.getDescription())
                .shortDescription(itemCatalog.getShortDescription())
                .itemPrice(itemCatalog.getItemPrice())
                .vat(itemCatalog.getVat())
                .build();
    }

}
