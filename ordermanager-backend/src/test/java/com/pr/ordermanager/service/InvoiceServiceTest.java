package com.pr.ordermanager.service;

import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.jpa.entity.*;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.repository.jpa.InvoiceRepository;
import com.pr.ordermanager.repository.jpa.ItemCatalogRepository;
import com.pr.ordermanager.repository.jpa.PersonRepository;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@Transactional
@Import( TestServicesConfiguration.class )
public class InvoiceServiceTest {

    @Autowired
    private InvoiceService invoiceService;
    @Autowired
    private PersonRepository personRepository;
    @Autowired
    private InvoiceRepository invoiceRepository;
    @Autowired
    private ItemCatalogRepository itemCatalogRepository;


    @Autowired
    TestServiceHelper testServiceHelper;

    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
        invoiceRepository.deleteAll();

    }

    @AfterEach
    void tearDown() {
        personRepository.deleteAll();
        personRepository.deleteAll();
    }

    @Test
    void savePerson() {
             PersonAddress personAddress =
             RepositoryTestHelper.createPersonAddress("Bonn", "Bonner str.", "12345",null);
             BankAccount bankAccount = RepositoryTestHelper.createBankAccount("DE11 1234 1234 1234 1234 0", "TestBank");
             Person person = RepositoryTestHelper.createPerson(PersonType.PRIVATE, personAddress, bankAccount);
             invoiceService.savePerson(person);
            //invoiceData.getInvoiceItems()
            Assert.assertNotNull(person.getId());
            Assert.assertNotNull(person.getBankAccount());
            Assert.assertNotNull(person.getPersonAddress());

            Assert.assertEquals(1, person.getBankAccount().size());
            Assert.assertEquals(1, person.getPersonAddress().size());

    }

    @Test
    void saveInvoice() {
        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        itemCatalogRepository.save(itemCatalog);
        InvoiceItem item = RepositoryTestHelper.createItem(itemCatalog);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        Invoice invoice = RepositoryTestHelper.createInvoice ( item, personSupplier, personRecipient );
        invoiceService.saveInvoice (invoice);
        Assertions.assertNotNull (invoice);

    }



    @Test
    void getInvoiceByInvoiceNumber() {
    }

    @Test
    void getAllData() {
    }

}