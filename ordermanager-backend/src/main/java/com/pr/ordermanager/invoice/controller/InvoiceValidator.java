package com.pr.ordermanager.invoice.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;

import static com.pr.ordermanager.exception.ErrorCode.*;

@Deprecated
/**
 * Need to be fixed empty collection in Bean Validation and than this validator can be removed
 */
public class InvoiceValidator {
    private InvoiceValidator() {

    }

    public static boolean validateInvoiceData(InvoiceFormModel invoiceData) {

        if (invoiceData.getInvoiceItems() == null || invoiceData.getInvoiceItems().size() == 0) {
            throw new OrderManagerException(CODE_20007, CODE_20007.getShortDesctiption() + " At least one Item should be selected.");
        }


        return true;
    }
}