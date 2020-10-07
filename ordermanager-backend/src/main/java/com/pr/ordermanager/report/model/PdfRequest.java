package com.pr.ordermanager.report.model;

/**
 * @author Oleksandr Prognimak
 * @created 07.10.2020 - 19:57
 */
public class PdfRequest {
    private String invoiceNumber;

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }
}
