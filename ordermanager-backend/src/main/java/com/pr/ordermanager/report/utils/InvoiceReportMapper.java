package com.pr.ordermanager.report.utils;

import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.report.model.InvoiceReportItem;
import com.pr.ordermanager.report.model.InvoiceReportModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.time.ZoneId;
import java.util.Date;
import java.util.stream.Collectors;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface InvoiceReportMapper {

    @Mapping(target = "invoiceId", source = "id")
    @Mapping(target = "recipientCompanyName", source = "invoiceRecipientPerson.companyName")
    @Mapping(target = "recipientLastName", source = "invoiceRecipientPerson.personLastName")
    @Mapping(target = "recipientFirstName", source = "invoiceRecipientPerson.personFirstName")
    @Mapping(target = "recipientStreet", source = "invoiceRecipientPerson.personAddress[0].street")
    @Mapping(target = "recipientCity", source = "invoiceRecipientPerson.personAddress[0].city")
    @Mapping(target = "recipientZipCode", source = "invoiceRecipientPerson.personAddress[0].zipCode")
    @Mapping(target = "recipientPostBoxCode", source = "invoiceRecipientPerson.personAddress[0].postBoxCode")
    @Mapping(target = "invoiceDate", expression = "java(asDate(source.getInvoiceDate()))")
    @Mapping(target = "creationDate", expression = "java(asDate(source.getCreationDate()))")
    @Mapping(target = "rateType", expression = "java(source.getRateType().name())")
    @Mapping(target = "personType", expression = "java(source.getInvoiceSupplierPerson().getPersonType().name())")
    @Mapping(target = "supplierCompanyName", source = "invoiceSupplierPerson.companyName")
    @Mapping(target = "supplierLastName", source = "invoiceSupplierPerson.personLastName")
    @Mapping(target = "supplierFirstName", source = "invoiceSupplierPerson.personFirstName")
    @Mapping(target = "supplierStreet", source = "invoiceSupplierPerson.personAddress[0].street")
    @Mapping(target = "supplierCity", source = "invoiceSupplierPerson.personAddress[0].city")
    @Mapping(target = "supplierZipCode", source = "invoiceSupplierPerson.personAddress[0].zipCode")
    @Mapping(target = "supplierPostBoxCode", source = "invoiceSupplierPerson.personAddress[0].postBoxCode")
    @Mapping(target = "supplierTaxNumber", source = "invoiceSupplierPerson.taxNumber")
    @Mapping(target = "supplierBankName", source = "invoiceSupplierPerson.bankAccount[0].bankName")
    @Mapping(target = "supplierIban", source = "invoiceSupplierPerson.bankAccount[0].iban")
    @Mapping(target = "supplierBicSwift", source = "invoiceSupplierPerson.bankAccount[0].bicSwift")
    @Mapping(target = "supplierAccountNumber", source = "invoiceSupplierPerson.bankAccount[0].accountNumber")
    @Mapping(target = "totalSunBrutto", source = "totalSumBrutto")
    @Mapping(target = "items", expression = "java(source.getInvoiceItems().stream().map(this::mapEntityToInvoiceReportItem).collect(Collectors.toList()))")
    InvoiceReportModel mapInvoiceEntityToReportModel(Invoice source);

    @Mapping(target = "invoiceId", source = "invoice.id")
    @Mapping(target = "description", source = "itemCatalog.description")
    InvoiceReportItem mapEntityToInvoiceReportItem(InvoiceItem source);

    default Date asDate(java.time.OffsetDateTime source) {
        return Date.from(source.toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant());
    }
}
