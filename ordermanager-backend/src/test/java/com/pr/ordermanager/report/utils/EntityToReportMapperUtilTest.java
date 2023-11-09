package com.pr.ordermanager.report.utils;

import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.entity.RateType;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.report.model.InvoiceReportModel;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class EntityToReportMapperUtilTest {

    @Test
    void mapInvoiceEntityToReportModel() {

        BankAccount recipientAccount =  BankAccount.builder()
                .accountNumber("RecipientBankAccount")
                .iban("Recipient_INBAN")
                .bankName("RecipientBankName")
                .bicSwift("RecipientBicSwift").build();
        List<BankAccount> recipientBankAccounts = new ArrayList<>();
        recipientBankAccounts.add(recipientAccount);

        BankAccount spplierAccount =  BankAccount.builder()
                .accountNumber("RecipientBankAccount")
                .iban("Recipient_INBAN")
                .bankName("RecipientBankName")
                .bicSwift("RecipientBicSwift").build();
        List<BankAccount> supplierBankAccounts = new ArrayList<>();
        supplierBankAccounts.add(spplierAccount);

        List<InvoiceItem> itemCatalogs = new ArrayList<>();
        InvoiceItem itemCatalog = InvoiceItem.builder()

                .itemPrice(100d)
                .vat(19)
                .amountItems(5d)
                .sumNetto(500d)
                .sumBrutto(95d)
                .itemCatalog(
                        ItemCatalog.builder()
                                .description("Item Description")
                                .shortDescription("Short description")
                                .itemPrice(100d).build()
                )
                .build();

        itemCatalogs.add(itemCatalog);




        Invoice testInvoice = Invoice.builder()
                .id(10l)
                .invoiceNumber("555555")
                .creationDate(OffsetDateTime.now())
                .invoiceDate(OffsetDateTime.now())
                .invoiceDescription("Invoice Description")
                .invoiceRecipientPerson(
                        Person.builder()
                                .personType(PersonType.ORGANISATION)
                                .companyName("Recipient company name")
                                .personFirstName("Recipient First Name")
                                .personLastName("Recipient Last Name")
                                .email("recipient@text.de")
                                .taxNumber("recipientTaxNumber")
                                .bankAccount(recipientBankAccounts)
                                .personAddress(
                                        Arrays.asList(PersonAddress.builder()
                                                .city("recipientCity")
                                                .street("recipientStreet")
                                                .zipCode("33333")
                                                .postBoxCode("44444")
                                                .build())
                                ).build()

                )
                .invoiceSupplierPerson(
                        Person.builder()
                                .personType(PersonType.PRIVATE)
                                .companyName("Supplier Company Name")
                                .personFirstName("Supplier First Name")
                                .personLastName("Supplier Last Name")
                                .email("supplier@text.de")
                                .taxNumber("supplierTaxNumber")
                                .bankAccount(supplierBankAccounts)
                                .personAddress(
                                        Arrays.asList(PersonAddress.builder()
                                                .city("supplierCity")
                                                .street("supplierStreet")
                                                .zipCode("supplierZipCode")
                                                .postBoxCode("supplierPostBoxCode")
                                                .build())
                                ).build()
                )
                .totalSumNetto(100D)
                .totalSumBrutto(119D)
                .rateType(RateType.DAILY)
                .invoiceItems(itemCatalogs)
                .build();

        testInvoice.getInvoiceItems().get(0).setInvoice(testInvoice);

        InvoiceReportModel invoiceReportModel =
                EntityToReportMapperUtil.mapInvoiceEntityToReportModel(testInvoice);

        assertNotNull(invoiceReportModel.getInvoiceDate());
        assertNotNull(invoiceReportModel.getInvoiceDescription());
        assertNotNull(invoiceReportModel.getInvoiceNumber());
        assertNotNull(invoiceReportModel.getInvoiceId());
        assertNotNull(invoiceReportModel.getPersonType());
        assertNotNull(invoiceReportModel.getCreationDate());
        assertNotNull(invoiceReportModel.getRateType());
        assertNotNull(invoiceReportModel.getTotalSumNetto());
        assertNotNull(invoiceReportModel.getTotalSunBrutto());


        assertNotNull(invoiceReportModel.getRecipientCity());
        assertNotNull(invoiceReportModel.getRecipientCompanyName());
        assertNotNull(invoiceReportModel.getRecipientFirstName());
        assertNotNull(invoiceReportModel.getRecipientLastName());
        assertNotNull(invoiceReportModel.getRecipientPostBoxCode());
        assertNotNull(invoiceReportModel.getRecipientStreet());
        assertNotNull(invoiceReportModel.getRecipientZipCode());


        assertNotNull(invoiceReportModel.getSupplierCity());
        assertNotNull(invoiceReportModel.getSupplierStreet());
        assertNotNull(invoiceReportModel.getSupplierFirstName());
        assertNotNull(invoiceReportModel.getSupplierLastName());
        assertNotNull(invoiceReportModel.getSupplierCompanyName());
        assertNotNull(invoiceReportModel.getSupplierBankName());
        assertNotNull(invoiceReportModel.getSupplierIban());
        assertNotNull(invoiceReportModel.getSupplierBicSwift());
        assertNotNull(invoiceReportModel.getSupplierAccountNumber());
        assertNotNull(invoiceReportModel.getSupplierZipCode());
        assertNotNull(invoiceReportModel.getSupplierTaxNumber());
        assertNotNull(invoiceReportModel.getSupplierPostBoxCode());

        assertNotNull(invoiceReportModel.getItems().get(0).getInvoiceId());

    }
}