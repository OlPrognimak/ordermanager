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
package com.pr.ordermanager.person.entity;

import com.pr.ordermanager.common.entity.AbstractEntity;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.security.entity.InvoiceUser;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
@SequenceGenerator(name ="invoice_seq_gen",sequenceName="invoice_seq", initialValue=1, allocationSize=100)
public class Person  extends AbstractEntity {
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="invoice_seq_gen")
    private Long id;
    private String personLastName;
    private String personFirstName;
    private String companyName;
    private String taxNumber;
    @Column(unique=true)
    private String email;
    @Enumerated(EnumType.STRING)
    private PersonType personType;
    @OneToMany(mappedBy="invoiceSupplierPerson", cascade = CascadeType.ALL)
    private List<Invoice>  invoiceSuppliers;
    @OneToMany(mappedBy="invoiceRecipientPerson", cascade = CascadeType.ALL)
    private List<Invoice>  invoiceRecipient;
    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name="user_id")
    private InvoiceUser invoiceUser;
    @ManyToMany (cascade = CascadeType.ALL)
    @OrderColumn(name = "id")
    @JoinTable(
        name = "person_to_address",
        joinColumns = @JoinColumn(name = "persons_id"),
        inverseJoinColumns = @JoinColumn(name = "address_id"))
    private List<PersonAddress> personAddress;
    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "person_to_account",
        joinColumns = @JoinColumn(name = "persons_id"),
        inverseJoinColumns = @JoinColumn(name = "bank_account_id"))
    @OrderColumn(name = "id")
    private List<BankAccount> bankAccount;

}
