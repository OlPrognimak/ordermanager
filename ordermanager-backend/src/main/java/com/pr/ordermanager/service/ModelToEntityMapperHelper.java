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
package com.pr.ordermanager.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pr.ordermanager.controller.model.BankAccountFormModel;
import com.pr.ordermanager.controller.model.InvoiceItemModel;
import com.pr.ordermanager.controller.model.PersonAddressFormModel;
import com.pr.ordermanager.controller.model.PersonFormModel;
import com.pr.ordermanager.jpa.entity.BankAccount;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.ItemCatalog;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.jpa.entity.PersonAddress;
import com.pr.ordermanager.jpa.entity.PersonType;
import java.util.Arrays;

/**
 * @author  Oleksandr Prognimak
 */
public class ModelToEntityMapperHelper {

   public static ObjectMapper createObjectMapper() {
       ObjectMapper mapper = new ObjectMapper();
       mapper.registerModule(new JavaTimeModule());
       mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
       return mapper;
   }


    public static Person mapPersonFormModelToEntity(PersonFormModel personFormModel) {
        Person person = Person.builder()
                .personFirstName(personFormModel.getPersonFirstName())
                .personLastName(personFormModel.getPersonLastName())
                .personType(PersonType.valueOf(personFormModel.getPersonType()))
                .companyName(personFormModel.getCompanyName())
                .taxNumber ( personFormModel.getTaxNumber () )
                .bankAccount(
                    Arrays.asList(
                        mapBankAccountFormModelToEntity(
                            personFormModel.getBankAccountFormModel()
                        )
                    )
                )
                .personAddress(
                    Arrays.asList(
                        mapPersonAddressFormModelToEntity (
                            personFormModel.getPersonAddressFormModel ()
                        )
                    )
                )
                .build();
        return person;
    }

    public static InvoiceItem mapInvoiceItemModelToEntity(
        InvoiceItemModel invoiceFormModel, Invoice invoice, ItemCatalog itemCatalog){

        InvoiceItem invoiceItem = InvoiceItem.builder()
            .itemPrice(invoiceFormModel.getItemPrice())
            .numberItems(invoiceFormModel.getNumberItems())
            .itemCatalog(itemCatalog)
            .vat(invoiceFormModel.getVat())
                .sumNetto(invoiceFormModel.getSumNetto())
                .sumBrutto(invoiceFormModel.getSumBrutto())
            .invoice(invoice)
            .build();
        return invoiceItem;
    }

   // List<InvoiceItem> items = invoiceFormModel.getInvoiceItems().stream().map(i->  )


    public static PersonAddress mapPersonAddressFormModelToEntity(PersonAddressFormModel personAddressFormModel){
       return PersonAddress.builder ()
           .postBoxCode (personAddressFormModel.getPostBoxCode())
           .zipCode (personAddressFormModel.getZipCode())
           .street (personAddressFormModel.getStreet())
           .city (personAddressFormModel.getCity()).build();
    }

    public static BankAccount mapBankAccountFormModelToEntity(BankAccountFormModel bankAccountFormModel){
        return BankAccount.builder ()
             .bankName ( bankAccountFormModel.getBankName ())
             .iban (bankAccountFormModel.getIban())
             .bicSwift (bankAccountFormModel.getBicSwift ())
             .accountNumber (bankAccountFormModel.getAccountNumber()).build();
    }

}
