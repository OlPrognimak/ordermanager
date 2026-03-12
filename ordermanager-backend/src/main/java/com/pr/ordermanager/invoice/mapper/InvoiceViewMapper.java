package com.pr.ordermanager.invoice.mapper;

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.utils.Utils;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface InvoiceViewMapper {

    @Mapping(target = "personRecipientId", source = "invoiceRecipientPerson.id")
    @Mapping(target = "personSupplierId", source = "invoiceSupplierPerson.id")
    @Mapping(target = "rateType", source = "rateType")
    @Mapping(target = "recipientFullName", expression = "java(buildFullName(source.getInvoiceRecipientPerson().getPersonFirstName(), source.getInvoiceRecipientPerson().getPersonLastName(), source.getInvoiceRecipientPerson().getCompanyName()))")
    @Mapping(target = "supplierFullName", expression = "java(buildFullName(source.getInvoiceSupplierPerson().getPersonFirstName(), source.getInvoiceSupplierPerson().getPersonLastName(), source.getInvoiceSupplierPerson().getCompanyName()))")
    InvoiceFormModel mapInvoiceEntityToFormModel(Invoice source);

    @Mapping(target = "catalogItemId", source = "itemCatalog.id")
    @Mapping(target = "description", source = "itemCatalog.description")
    InvoiceItemModel mapEntityToModelInvoiceItem(InvoiceItem source);

    ItemCatalogModel mapEntityToItemCatalogModel(ItemCatalog itemCatalog);

    default List<DropdownDataType> mapListCatalogItemsToDropdownType(List<ItemCatalog> itemCatalogs) {
        return itemCatalogs.stream()
                .map(c -> new DropdownDataType(
                        c.getDescription() + " : Price :" + c.getItemPrice() + " ",
                        String.valueOf(c.getId())))
                .toList();
    }

    default String buildFullName(String firstName, String lastName, String companyName) {
        return (Utils.emptyOrValue(firstName) + " "
                + Utils.emptyOrValue(lastName) + " "
                + Utils.emptyOrValue(companyName)).trim();
    }
}
