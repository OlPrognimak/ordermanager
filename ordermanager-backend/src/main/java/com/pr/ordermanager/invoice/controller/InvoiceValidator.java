package com.pr.ordermanager.invoice.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;

import static com.pr.ordermanager.exception.ErrorCode.*;


/**
 * Need to be fixed empty collection in Bean Validation and than this validator can be removed
 */
//TODO need to be implemented via javax.validation
public class InvoiceValidator {
    private InvoiceValidator() {

    }

    /**
     *
     * @param invoiceData the model
     * @return true if successful validated
     */
    public static boolean validateInvoiceData(InvoiceFormModel invoiceData) {
        if (invoiceData.getInvoiceItems() == null || invoiceData.getInvoiceItems().size() == 0) {
            throw new OrderManagerException(CODE_20007, CODE_20007.getMessage() + " At least one Item should be selected.");
        }
        if(invoiceData.getCreationDate().isBefore(invoiceData.getInvoiceDate())){
            throw new OrderManagerException(CODE_20009, CODE_20009.getMessage() + " Creation date can not be less then invoice date.");
        }
        return true;
    }
}