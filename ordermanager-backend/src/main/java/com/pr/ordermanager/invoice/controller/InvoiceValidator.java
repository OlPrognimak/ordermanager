package com.pr.ordermanager.invoice.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;

import java.util.Objects;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20001;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20002;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20007;
import static com.pr.ordermanager.exception.ErrorCode.CODE_20009;


/**
 * Need to be fixed empty collection in Bean Validation and than this validator can be removed
 */
//TODO need to be implemented via jakarta.validation
public class InvoiceValidator {
    private InvoiceValidator() {

    }

    /**
     *
     * @param invoiceData the model
     * @return true if successful validated
     */
    public static boolean validateInvoiceData(InvoiceFormModel invoiceData) {
        if (Objects.isNull(invoiceData.getCreationDate())) {
            throw new OrderManagerException(CODE_20001, CODE_20001.getMessage());
        }
        if (Objects.isNull(invoiceData.getInvoiceDate())) {
            throw new OrderManagerException(CODE_20002, CODE_20002.getMessage());
        }
        if (invoiceData.getInvoiceItems() == null || invoiceData.getInvoiceItems().size() == 0) {
            throw new OrderManagerException(CODE_20007, CODE_20007.getMessage() + " At least one Item should be selected.");
        }
        if(invoiceData.getCreationDate().isBefore(invoiceData.getInvoiceDate())){
            throw new OrderManagerException(CODE_20009, CODE_20009.getMessage() + " Creation date can not be less then invoice date.");
        }
        return true;
    }

    public static void validateItemCatalogData(ItemCatalogModel im) {
        if (Objects.isNull(im)) {
            throw new OrderManagerException(CODE_0000, CODE_0000.getMessage() + " Item catalog payload can not be null.");
        }

        if (Objects.isNull(im.getDescription()) || im.getDescription().trim().isEmpty()) {
            throw new OrderManagerException(CODE_0000, CODE_0000.getMessage() + " Item description can not be blank.");
        }

        if (Objects.isNull(im.getItemPrice()) || im.getItemPrice() <= 0) {
            throw new OrderManagerException(CODE_0000, CODE_0000.getMessage() + " Item price should be greater then 0.");
        }

        if (Objects.isNull(im.getVat()) || im.getVat() <= 0) {
            throw new OrderManagerException(CODE_0000, CODE_0000.getMessage() + " VAT should be greater then 0.");
        }
    }
}
