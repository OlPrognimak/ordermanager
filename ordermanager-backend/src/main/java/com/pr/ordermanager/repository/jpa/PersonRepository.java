package com.pr.ordermanager.repository.jpa;


import com.pr.ordermanager.jpa.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    /**
     * Search {@code personFirstName} by first and last name with all invoices
     * @param personFirstName the first name of person
     * @param personLastName the last name of person
     * @return found person
     */
    Person findByPersonFirstNameAndPersonLastName(String personFirstName, String personLastName);
}
