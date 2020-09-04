package com.pr.ordermanager.jpa.entity;

import lombok.*;

import javax.persistence.*;
import java.time.OffsetDateTime;
import java.util.List;


@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    /**
     * The list of invoices
     */
    @OneToMany(
            mappedBy = "invoice",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    List<InvoiceItem> invoiceItems;
    /**The person which in and made and supply an invoice */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="invoice_supplier")
    private Person invoiceSupplierPerson;
    /**The person which receive an invoice */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="invoice_recipient")
    private Person invoiceRecipientPerson;
    /**The date of creation invoice*/
    private OffsetDateTime creationDate;
    /**For which period is the invoice. The month and year*/
    private OffsetDateTime invoiceDate;
    /**The number of invoice*/
    @Column(length = 50, unique = true)
    private String invoiceNumber;
    /**The description of invoice. For example project name.*/
    private String invoiceDescription;
    /**
     * Define the rate type of Invoice. It can be hourly and daily rate
     */
    @Enumerated(EnumType.STRING)
    private RateType rateType;
    /**The tottal netto summa */
    private Double totalSumNetto;
    /**The tottal brutto summa */
    private Double totalSumBrutto;

}
