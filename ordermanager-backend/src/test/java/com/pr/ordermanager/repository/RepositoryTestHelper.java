package com.pr.ordermanager.repository;

import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.controller.model.InvoiceItemModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.jpa.entity.PersonType;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import lombok.var;

import static com.pr.ordermanager.jpa.entity.RateType.DAILY;

public class RepositoryTestHelper {
    private RepositoryTestHelper(){

    }

    public static PersonInvoice createPersonInvoices(InvoiceData invoiceData){
        var invoicePersonData = PersonInvoice.builder()
                .personFirstName("Oleksandr")
                .personSurname("Prognimak")
                .personType(PersonType.PRIVATE)
                .invoices(new ArrayList<>()).build();
        invoicePersonData.getInvoices().add(invoiceData);
        return invoicePersonData;

    }

    public static InvoiceData createInvoiceData(InvoiceItem item){
        var invoiceData = new InvoiceData();
        invoiceData.setInvoiceItems(new ArrayList<>());
        invoiceData.getInvoiceItems().add(item);
        invoiceData.setInvoiceDate(OffsetDateTime.now());
        invoiceData.setInvoiceNumber("POST-2020-0006");
        invoiceData.setCreationDate(OffsetDateTime.now());
        invoiceData.setRateType(DAILY);

        return invoiceData;
    }

    public static InvoiceItem createItem(){
        var item=new InvoiceItem();
        item.setDescription("Geleistete Tagen  im Juni 2020 gemäß \n" +
                "beigefügten abgezeichneten\n" +
                "Leistungsnachweisen\n");
        item.setNumberItems(22d);
        item.setItemPrice(600d);
        item.setVat(16);
        return item;
    }

    public static InvoiceFormModel createInvoiceFormModel(){
        InvoiceItemModel invoiceItemModel = InvoiceItemModel.builder()
            .itemPrice(75d)
            .description("Description")
            .numberItems(165d)
            .vat(19).build();


        InvoiceFormModel invoiceFormModel = InvoiceFormModel.builder()
            .creationDate(OffsetDateTime.now())
            .invoiceDate(OffsetDateTime.now())
            .invoiceNumber("POST-2020-0006")
            .personFirstName("Oleksandr")
            .personSurname("Prognimak")
            .personType("PRIVATE")
            .rateType("HOURLY")
            .invoiceItems(Arrays.asList(invoiceItemModel))
            .build();


        return invoiceFormModel;

    }
}
