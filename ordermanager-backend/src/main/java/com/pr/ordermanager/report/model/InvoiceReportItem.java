package com.pr.ordermanager.report.model;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class InvoiceReportItem {
    private Long invoiceId;
    private String description;
    private Double amountItems;
    private Double itemPrice;
    private Integer vat;
    private Double sumNetto;
    private Double sumBrutto;
}
