package com.pr.ordermanager.jpa.entity;


import lombok.*;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class ItemCatalog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String description;
    private String shortDescription;
    private Double itemPrice;
    private Integer vat;

}
