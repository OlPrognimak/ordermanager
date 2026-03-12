package com.pr.ordermanager.invoice.mapper;

import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InvoiceItemMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "itemCatalog", source = "itemCatalog")
    @Mapping(target = "invoice", source = "invoice")
    InvoiceItem mapInvoiceItemModelToEntity(InvoiceItemModel invoiceFormModel, Invoice invoice, ItemCatalog itemCatalog);
}
