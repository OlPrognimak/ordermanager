package com.pr.ordermanager.jpa.entity;

import lombok.*;

import javax.persistence.*;

@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class InvoiceItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Double numberItems;
    private Double itemPrice;
    private Integer vat;
    private Double sumNetto;
    private Double sumBrutto;
    @ManyToOne(fetch = FetchType.EAGER)
    private ItemCatalog itemCatalog;
    @ManyToOne(fetch = FetchType.LAZY)
    private Invoice invoice;
}
