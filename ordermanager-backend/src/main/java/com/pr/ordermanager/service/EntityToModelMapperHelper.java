package com.pr.ordermanager.service;

import com.pr.ordermanager.controller.model.*;
import com.pr.ordermanager.jpa.entity.*;

import java.util.List;
import java.util.stream.Collectors;

public class EntityToModelMapperHelper {

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


    public static InvoiceFormModel mapInvoiceEntityToFormModel(Invoice invoice){
        InvoiceFormModel invoiceFormModel = InvoiceFormModel.builder()
            .personRecipientId(invoice.getId())
            .invoiceNumber(invoice.getInvoiceNumber())
            .invoiceDate(invoice.getInvoiceDate())
            .creationDate(invoice.getCreationDate())
            .rateType(invoice.getRateType().name())
            .personSupplierId(invoice.getInvoiceSupplierPerson().getId())
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
                .numberItems(invoiceItem.getNumberItems())
                .vat(invoiceItem.getVat()).build();
    }

    public static List<DropdownDataType> mapPersonToDropdownType(List<Person> persons){
        return persons.stream().map(p->new DropdownDataType(
                p.getPersonLastName()+ " "+p.getPersonLastName()+ " " ,
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
