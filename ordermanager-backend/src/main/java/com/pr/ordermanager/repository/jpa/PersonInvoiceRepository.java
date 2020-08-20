package com.pr.ordermanager.repository.jpa;


import com.pr.ordermanager.jpa.entity.PersonInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonInvoiceRepository extends JpaRepository<PersonInvoice, Long> {
    /**
     * Search {@code personFirstName} by first and last name with all invoices
     * @param personFirstName the first name of person
     * @param personSurname the last name of person
     * @return found person
     */
    PersonInvoice findByPersonFirstNameAndPersonSurname(String personFirstName, String personSurname);
}
