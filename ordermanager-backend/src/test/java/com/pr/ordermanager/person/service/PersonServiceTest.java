package com.pr.ordermanager.person.service;

import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.repository.PersonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @created 21.09.2020 - 15:09
 */

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
@Import( {TestServicesConfiguration.class, TestServiceHelper.class} )
class PersonServiceTest {

    @Autowired
    PersonService personService;
    @Autowired
    PersonRepository personRepository;

    @Autowired
    TestServiceHelper testServiceHelper;

    @BeforeEach
    void setUp() {
         personRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        personRepository.deleteAll();
    }

    @Test
    void savePerson() {
        PersonAddress personAddress =
                RepositoryTestHelper.createPersonAddress("München", "Bonner str.", "12345",null);
        BankAccount bankAccount = RepositoryTestHelper.createBankAccount("DE11 1234 1234 1234 1234 0", "TestBank");
        Person person = RepositoryTestHelper.createPerson(PersonType.PRIVATE, personAddress, bankAccount);
        personService.savePerson(person, "admin");
        //invoiceData.getInvoiceItems()
        assertNotNull(person.getId());
        assertNotNull(person.getBankAccount());
        assertNotNull(person.getPersonAddress());
        assertEquals(1, person.getBankAccount().size());
        assertEquals(1, person.getPersonAddress().size());

    }


}