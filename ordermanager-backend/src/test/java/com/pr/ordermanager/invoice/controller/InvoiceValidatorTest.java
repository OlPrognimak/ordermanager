package com.pr.ordermanager.invoice.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Collections;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20001;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20002;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20007;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20009;

class InvoiceValidatorTest {

    @Test
    void validateInvoiceDataShouldFailWhenCreationDateIsNull() {
        InvoiceFormModel model = InvoiceFormModel.builder()
                .invoiceDate(OffsetDateTime.now())
                .invoiceItems(Collections.emptyList())
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateInvoiceData(model));

        Assertions.assertEquals(CODE_20001, ex.getErrorCode());
    }

    @Test
    void validateInvoiceDataShouldFailWhenInvoiceDateIsNull() {
        InvoiceFormModel model = InvoiceFormModel.builder()
                .creationDate(OffsetDateTime.now())
                .invoiceItems(Collections.emptyList())
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateInvoiceData(model));

        Assertions.assertEquals(CODE_20002, ex.getErrorCode());
    }

    @Test
    void validateInvoiceDataShouldFailWhenItemsAreEmpty() {
        InvoiceFormModel model = InvoiceFormModel.builder()
                .creationDate(OffsetDateTime.now())
                .invoiceDate(OffsetDateTime.now())
                .invoiceItems(Collections.emptyList())
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateInvoiceData(model));

        Assertions.assertEquals(CODE_20007, ex.getErrorCode());
    }

    @Test
    void validateInvoiceDataShouldFailWhenCreationDateBeforeInvoiceDate() {
        OffsetDateTime now = OffsetDateTime.now();
        InvoiceFormModel model = InvoiceFormModel.builder()
                .creationDate(now.minusDays(1))
                .invoiceDate(now)
                .invoiceItems(Collections.singletonList(null))
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateInvoiceData(model));

        Assertions.assertEquals(CODE_20009, ex.getErrorCode());
    }

    @Test
    void validateInvoiceDataShouldPassForValidModel() {
        OffsetDateTime now = OffsetDateTime.now();
        InvoiceFormModel model = InvoiceFormModel.builder()
                .creationDate(now)
                .invoiceDate(now.minusDays(1))
                .invoiceItems(Collections.singletonList(null))
                .build();

        Assertions.assertTrue(InvoiceValidator.validateInvoiceData(model));
    }

    @Test
    void validateItemCatalogDataShouldFailWhenDescriptionBlank() {
        ItemCatalogModel model = ItemCatalogModel.builder()
                .description("   ")
                .itemPrice(1.0)
                .vat(20)
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateItemCatalogData(model));

        Assertions.assertEquals(CODE_0000, ex.getErrorCode());
    }

    @Test
    void validateItemCatalogDataShouldFailWhenPriceInvalid() {
        ItemCatalogModel model = ItemCatalogModel.builder()
                .description("Consulting")
                .itemPrice(0.0)
                .vat(20)
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateItemCatalogData(model));

        Assertions.assertEquals(CODE_0000, ex.getErrorCode());
    }

    @Test
    void validateItemCatalogDataShouldFailWhenVatInvalid() {
        ItemCatalogModel model = ItemCatalogModel.builder()
                .description("Consulting")
                .itemPrice(100.0)
                .vat(0)
                .build();

        OrderManagerException ex = Assertions.assertThrows(OrderManagerException.class,
                () -> InvoiceValidator.validateItemCatalogData(model));

        Assertions.assertEquals(CODE_0000, ex.getErrorCode());
    }

    @Test
    void validateItemCatalogDataShouldPassForValidModel() {
        ItemCatalogModel model = ItemCatalogModel.builder()
                .description("Consulting")
                .itemPrice(100.0)
                .vat(20)
                .build();

        Assertions.assertDoesNotThrow(() -> InvoiceValidator.validateItemCatalogData(model));
    }
}
