package com.pr.ordermanager.invoice.service;

import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.entity.RateType;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.person.entity.Person;

import java.util.ArrayList;
import java.util.List;

public class MappingUtils {

    private MappingUtils() {
    }

    public static Invoice mapInvoiceFormModelToEntity(InvoiceFormModel invoiceFormModel,
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
        invoice.setInvoiceItems(new ArrayList<>());
        personInvoiceSupplier.setInvoiceSuppliers(List.of(invoice));
        personInvoiceRecipient.setInvoiceRecipient(List.of(invoice));
        return invoice;

    }


    public static void  mapInvoiceItemModelToEntity(
            InvoiceItemModel invoiceFormModel, Invoice invoice, ItemCatalog itemCatalog) {

        InvoiceItem invoiceItem = InvoiceItem.builder()
                .itemPrice(invoiceFormModel.getItemPrice())
                .amountItems(invoiceFormModel.getAmountItems())
                .itemCatalog(itemCatalog)
                .vat(invoiceFormModel.getVat())
                .sumNetto(invoiceFormModel.getSumNetto())
                .sumBrutto(invoiceFormModel.getSumBrutto())
                .invoice(invoice)
                .build();
        invoice.getInvoiceItems().add(invoiceItem);
    }

}
