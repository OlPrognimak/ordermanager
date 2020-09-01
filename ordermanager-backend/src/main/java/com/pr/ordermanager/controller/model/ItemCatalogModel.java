package com.pr.ordermanager.controller.model;

import lombok.*;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class ItemCatalogModel {
    private Long id;
    private String description;
    private String shortDescription;
    private Double itemPrice;
    private Integer vat;
}
