/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.invoice.entity;

import com.pr.ordermanager.common.entity.AbstractEntity;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.security.entity.InvoiceUser;
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
public class Invoice extends AbstractEntity {

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
    private List<InvoiceItem> invoiceItems;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id")
    private InvoiceUser invoiceUser;
    /**The person which  made and supply an invoice */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="invoice_supplier")
    private Person invoiceSupplierPerson;
    /**The person which receive an invoice */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="invoice_recipient")
    private Person invoiceRecipientPerson;
    /**The date of creation of invoice*/
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
