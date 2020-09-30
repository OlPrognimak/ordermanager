package com.pr.ordermanager.invoice.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;

import static com.pr.ordermanager.exception.ErrorCode.*;

public class InvoiceValidator {
    private InvoiceValidator() {

    }//TODO need to implemen

    public static boolean validateInvoiceData(InvoiceFormModel invoiceData) {

        if (invoiceData.getCreationDate() == null) {
            throw new OrderManagerException(CODE_20001);
        } else if (invoiceData.getInvoiceDate() == null) {
            throw new OrderManagerException(CODE_20002);
        } else if (invoiceData.getInvoiceNumber() == null) {
            throw new OrderManagerException(CODE_20003, CODE_20003.getShortDesctiption());
        } else if (invoiceData.getPersonRecipientId() == null) {
            throw new OrderManagerException(CODE_20006, CODE_20006.getShortDesctiption());
        } else if (invoiceData.getPersonSupplierId()== null) {
            throw new OrderManagerException(CODE_20005, CODE_20005.getShortDesctiption());
        } else if (invoiceData.getRateType() == null) {
            throw new OrderManagerException(CODE_20004, CODE_20004.getShortDesctiption());
        }


        if (invoiceData.getInvoiceItems() == null || invoiceData.getInvoiceItems().size() == 0) {
            invoiceData.getInvoiceItems().stream().forEach(invoiceItem -> {
                if (invoiceItem.getCatalogItemId() == null) {
                    throw new OrderManagerException(CODE_20008, CODE_20008.getShortDesctiption()+" At least one item from catalog should be selected.");
                } else if (invoiceItem.getItemPrice() == 0d || invoiceItem.getItemPrice() < 0d) {
                    throw new OrderManagerException(CODE_20008,CODE_20008.getShortDesctiption()+ " The item price must be more as 0.");
                } else if (invoiceItem.getNumberItems() == 0d || invoiceItem.getNumberItems() < 0d) {
                    throw new OrderManagerException(CODE_20008, CODE_20008.getShortDesctiption()+ " The amount of items must be more as 0.");
                }
            });
        } else {
            throw new OrderManagerException(CODE_20007, CODE_20007.getShortDesctiption()+" At least one Item should be selected.");
        }


        return true;
    }
}