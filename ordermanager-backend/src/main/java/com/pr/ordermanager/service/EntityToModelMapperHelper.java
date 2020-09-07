package com.pr.ordermanager.service;

import com.pr.ordermanager.controller.model.*;
import com.pr.ordermanager.jpa.entity.*;
import com.pr.ordermanager.utils.Utils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * The mapping helper for mapping JPA Entity to Rest Model POJO object
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
     * Maps {@code invoice} {@link Invoice} to {@long InvoiceFormModel}
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
                .numberItems(invoiceItem.getNumberItems())
                .vat(invoiceItem.getVat())
                .sumNetto(invoiceItem.getSumNetto())
                .sumBrutto(invoiceItem.getSumBrutto())
                .build();
    }

    public static List<DropdownDataType> mapPersonToDropdownType(List<Person> persons){
        return persons.stream().map(p->new DropdownDataType(
                Utils.emptyOrValue(p.getPersonLastName())+ " "+
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
