package com.pr.ordermanager.controller.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class InvoiceItemModel {

    private String description;
    private Double numberItems;
    private Double itemPrice;
    private Integer vat;

}
