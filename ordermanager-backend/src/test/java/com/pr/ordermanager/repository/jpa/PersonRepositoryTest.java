package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.person.repository.PersonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
class PersonRepositoryTest {
    @Autowired
    PersonRepository personRepository;


    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        personRepository.deleteAll();
    }

    @Test
    public void testGetAll() throws Exception {
//        InvoiceItem item = RepositoryTestHelper.createItem();
//        Invoice data = RepositoryTestHelper.createInvoice(item);
//        Person person = RepositoryTestHelper.createPerson(data);
//        personRepository.save(person);
//        List<Person> personList = personRepository.findAll();
//        Assertions.assertEquals(1, personList.size());
//        Assertions.assertEquals(1, personList.get(0).getInvoiceSuppliers().size());
//        Assertions.assertEquals(1, personList.get(0).getInvoiceSuppliers().get(0).getInvoiceItems().size());
    }

}