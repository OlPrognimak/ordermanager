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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;


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
    /**
     * Define the rate type of Invoice. It can be hourly and daily rate
     */
    @Enumerated(EnumType.STRING)
    private RateType rateType;

}
