package com.pr.ordermanager.invoice.service;

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.entity.RateType;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.utils.Utils;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface InvoiceMapper {

    @Mapping(target = "rateType", expression = "java(RateType.valueOf(invoiceFormModel.getRateType()))")
    @Mapping(target = "invoiceSupplierPerson", ignore = true)
    @Mapping(target = "invoiceRecipientPerson", ignore = true)
    @Mapping(target = "invoiceItems", ignore = true)
    @Mapping(target = "invoiceUser", ignore = true)
    Invoice mapInvoiceModelToEntity(InvoiceFormModel invoiceFormModel);

    @Mapping(target = "rateType", expression = "java(RateType.valueOf(invoiceFormModel.getRateType()))")
    @Mapping(target = "invoiceSupplierPerson", ignore = true)
    @Mapping(target = "invoiceRecipientPerson", ignore = true)
    @Mapping(target = "invoiceItems", ignore = true)
    @Mapping(target = "invoiceUser", ignore = true)
    void mapInvoiceModelToExistedEntity(InvoiceFormModel invoiceFormModel, @MappingTarget Invoice invoice);

    @Mapping(target = "itemCatalog", ignore = true)
    @Mapping(target = "invoice", ignore = true)
    InvoiceItem mapInvoiceItemModelToEntity(InvoiceItemModel invoiceItemModel);

    ItemCatalog mapModelToItemCatalogEntity(ItemCatalogModel source);

    void mapItemCatalogModelToExistedEntity(ItemCatalogModel model, @MappingTarget ItemCatalog entity);

    @Mapping(target = "personRecipientId", source = "invoiceRecipientPerson.id")
    @Mapping(target = "personSupplierId", source = "invoiceSupplierPerson.id")
    @Mapping(target = "rateType", expression = "java(source.getRateType().name())")
    @Mapping(target = "recipientFullName", expression = "java(fullName(source.getInvoiceRecipientPerson().getPersonFirstName(), source.getInvoiceRecipientPerson().getPersonLastName(), source.getInvoiceRecipientPerson().getCompanyName()))")
    @Mapping(target = "supplierFullName", expression = "java(fullName(source.getInvoiceSupplierPerson().getPersonFirstName(), source.getInvoiceSupplierPerson().getPersonLastName(), source.getInvoiceSupplierPerson().getCompanyName()))")
    @Mapping(target = "invoiceItems", expression = "java(source.getInvoiceItems().stream().map(this::mapEntityToModelInvoiceItem).collect(Collectors.toList()))")
    InvoiceFormModel mapInvoiceEntityToFormModel(Invoice source);

    @Mapping(target = "catalogItemId", source = "itemCatalog.id")
    @Mapping(target = "description", source = "itemCatalog.description")
    InvoiceItemModel mapEntityToModelInvoiceItem(InvoiceItem source);

    ItemCatalogModel mapEntityToItemCatalogModel(ItemCatalog itemCatalog);

    default List<DropdownDataType> mapListCatalogItemsToDropdownType(List<ItemCatalog> itemCatalogs) {
        return itemCatalogs.stream().map(c -> new DropdownDataType(
                c.getDescription() + " : Price :" + c.getItemPrice() + " ",
                String.valueOf(c.getId()))).collect(Collectors.toList());
    }

    default String fullName(String firstName, String lastName, String companyName) {
        return (Utils.emptyOrValue(firstName) + " " + Utils.emptyOrValue(lastName) + " " + Utils.emptyOrValue(companyName)).trim();
    }
}
