package com.pr.ordermanager.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.controller.model.InvoiceItemModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.jpa.entity.PersonType;
import com.pr.ordermanager.jpa.entity.RateType;
import java.util.Arrays;
import java.util.stream.Collectors;


public class ModelToEntityMapper {

   public static ObjectMapper createObjectMapper() {
       ObjectMapper mapper = new ObjectMapper();
       mapper.registerModule(new JavaTimeModule());
       mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
       return mapper;
   }


    public static InvoiceFormModel mapEntityToFormModel(PersonInvoice personInvoice){
        return InvoiceFormModel.builder()
            .personFirstName(personInvoice.getPersonFirstName())
            .personSurname(personInvoice.getPersonSurname())
            .personType(personInvoice.getPersonType().name())
            .rateType(personInvoice.getInvoices().get(0).getRateType().name())
            .creationDate(personInvoice.getInvoices().get(0).getCreationDate())
            .invoiceDate(personInvoice.getInvoices().get(0).getInvoiceDate())
            .invoiceNumber(personInvoice.getInvoices().get(0).getInvoiceNumber())
            .invoiceItems(personInvoice.getInvoices()
                                       .get(0)
                .getInvoiceItems()
                .stream()
                .map(i->mapModelItemToEntityItem(i)).collect(Collectors.toList())).build();

    }



    private static InvoiceItemModel mapModelItemToEntityItem(InvoiceItem itemModel){
        return InvoiceItemModel.builder()
            .numberItems(itemModel.getNumberItems())
            .description(itemModel.getDescription())
            .itemPrice(itemModel.getItemPrice())
            .vat(itemModel.getVat()).build();
    }

    public static PersonInvoice mapModelToEntityPersonInvoice(InvoiceFormModel invoiceFormModel) {
        PersonInvoice personInvoice = PersonInvoice.builder()
                .personFirstName(invoiceFormModel.getPersonFirstName())
                .personSurname(invoiceFormModel.getPersonSurname())
                .personType(PersonType.valueOf(invoiceFormModel.getPersonType()))
                .build();
        personInvoice.setInvoices(Arrays.asList(mapModelToEntityInvoiceData(invoiceFormModel,personInvoice)));
        return personInvoice;
    }


    public static InvoiceItem  mapModelToEntityInvoiceItem(InvoiceItemModel invoiceFormModel,InvoiceData invoiceData){

        InvoiceItem invoiceItem = InvoiceItem.builder()
                .itemPrice(invoiceFormModel.getItemPrice())
                .description(invoiceFormModel.getDescription())
                .numberItems(invoiceFormModel.getNumberItems())
                .vat(invoiceFormModel.getVat())
                .invoiceData(invoiceData)
                .build();
        return invoiceItem;
    }

   // List<InvoiceItem> items = invoiceFormModel.getInvoiceItems().stream().map(i->  )


    public static InvoiceData mapModelToEntityInvoiceData(InvoiceFormModel invoiceFormModel,PersonInvoice personInvoice){
        InvoiceData invoiceData = InvoiceData.builder()
            .invoiceDate(invoiceFormModel.getInvoiceDate())
            .invoiceNumber(invoiceFormModel.getInvoiceNumber())
            .creationDate(invoiceFormModel.getCreationDate())
            .rateType( RateType.valueOf(invoiceFormModel.getRateType()) )
                .personInvoice(personInvoice)
            .build();
        invoiceData.setInvoiceItems(
                invoiceFormModel.getInvoiceItems().stream().map(i->mapModelToEntityInvoiceItem(i, invoiceData)).collect(Collectors.toList())
        );
      return invoiceData;
    }
}
