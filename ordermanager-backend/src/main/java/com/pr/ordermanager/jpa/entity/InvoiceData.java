package com.pr.ordermanager.jpa.entity;

import java.time.OffsetDateTime;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;


@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class InvoiceData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToMany(
            mappedBy = "invoiceData",
            cascade = CascadeType.ALL,
            orphanRemoval = true)

    List<InvoiceItem> invoiceItems;

    @ManyToOne(fetch = FetchType.LAZY)
    private PersonInvoice personInvoice;
    private OffsetDateTime creationDate;
    private OffsetDateTime invoiceDate;
    @Column(length = 50)
    private String invoiceNumber;
    @Enumerated(EnumType.STRING)
    private RateType rateType;

}
