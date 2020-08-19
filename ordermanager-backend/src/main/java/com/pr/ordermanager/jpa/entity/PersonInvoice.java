package com.pr.ordermanager.jpa.entity;


import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
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
public class PersonInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "personInvoice",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<InvoiceData> invoices;

    private String personSurname;

    private String personFirstName;


    @Enumerated(EnumType.STRING)
    private PersonType personType;


    public String toString() {
          return "Id="+id+": personSurname="+personSurname+": personFirstName="+personFirstName;
    }

}
