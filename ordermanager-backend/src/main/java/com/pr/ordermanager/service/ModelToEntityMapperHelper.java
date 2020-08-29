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
