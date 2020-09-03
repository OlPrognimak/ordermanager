package com.pr.ordermanager.jpa.entity;

import lombok.*;

import javax.persistence.*;
import java.util.List;

@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class Person {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String personLastName;
    private String personFirstName;
    private String companyName;
    private String taxNumber;
    @Enumerated(EnumType.STRING)
    private PersonType personType;
    @OneToMany(mappedBy="invoiceSupplierPerson", cascade = CascadeType.ALL)
    private List<Invoice>  invoiceSuppliers;
    @OneToMany(mappedBy="invoiceRecipientPerson", cascade = CascadeType.ALL)
    private List<Invoice>  invoiceRecipient;
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
