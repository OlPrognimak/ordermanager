package com.pr.ordermanager.jpa.entity;

import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.OneToMany;
import javax.persistence.OrderColumn;
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
        inverseJoinColumns = @JoinColumn(name = "account_id"))
    private List<PersonAddress> personAddress;
    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "person_to_account",
        joinColumns = @JoinColumn(name = "persons_id"),
        inverseJoinColumns = @JoinColumn(name = "bank_account_id"))
    @OrderColumn(name = "id")
    private List<BankAccount> bankAccount;

}
