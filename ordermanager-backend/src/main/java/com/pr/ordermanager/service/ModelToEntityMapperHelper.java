package com.pr.ordermanager.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pr.ordermanager.controller.model.BankAccountFormModel;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.controller.model.InvoiceItemModel;
import com.pr.ordermanager.controller.model.PersonAddressFormModel;
import com.pr.ordermanager.controller.model.PersonFormModel;
import com.pr.ordermanager.jpa.entity.BankAccount;
import com.pr.ordermanager.jpa.entity.Invoice;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.jpa.entity.PersonAddress;
import com.pr.ordermanager.jpa.entity.PersonType;
import com.pr.ordermanager.jpa.entity.RateType;
import java.util.Arrays;
import java.util.stream.Collectors;


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

    public static InvoiceItem mapInvoiceItemModelToEntity(InvoiceItemModel invoiceFormModel, Invoice invoice){

        InvoiceItem invoiceItem = InvoiceItem.builder()
            .itemPrice(invoiceFormModel.getItemPrice())
            .description(invoiceFormModel.getDescription())
            .numberItems(invoiceFormModel.getNumberItems())
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

    public static Invoice mapInvoiceFormModelToEntity(InvoiceFormModel invoiceFormModel,
                                    Person personInvoiceSupplier,
                                    Person personInvoiceRecipient){
        Invoice invoice = Invoice.builder()
            .invoiceDate(invoiceFormModel.getInvoiceDate())
            .invoiceNumber(invoiceFormModel.getInvoiceNumber())
            .creationDate(invoiceFormModel.getCreationDate())
            .rateType( RateType.valueOf(invoiceFormModel.getRateType()) )
            .invoiceSupplierPerson(personInvoiceSupplier)
            .invoiceRecipientPerson(personInvoiceRecipient)
             .build();
        invoice.setInvoiceItems(
                invoiceFormModel.getInvoiceItems()
                    .stream()
                    .map(i->mapInvoiceItemModelToEntity(i, invoice)).collect(Collectors.toList())
        );
        personInvoiceSupplier.setInvoiceSuppliers(Arrays.asList(invoice));
        personInvoiceRecipient.setInvoiceRecipient(Arrays.asList(invoice));
      return invoice;
    }
}
