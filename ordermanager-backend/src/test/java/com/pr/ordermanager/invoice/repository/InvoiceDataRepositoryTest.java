package com.pr.ordermanager.invoice.repository;

import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.person.service.PersonService;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;


@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import( TestServicesConfiguration.class )
@Transactional
class InvoiceDataRepositoryTest {

    @Autowired
    InvoiceRepository invoiceDataRepository;
    @Autowired
    InvoiceItemRepository invoiceItemRepository;
    @Autowired
    ItemCatalogRepository itemCatalogRepository;
    @Autowired
    UserService userService;
    @Autowired
    PersonService personService;
    @Autowired
    PersonRepository personRepository;
    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void setUp() {
        invoiceDataRepository.deleteAll();
        personRepository.deleteAll();
        userRepository.deleteAll();
    }

    @AfterEach
    @Transactional
    void tearDown() {
        invoiceDataRepository.deleteAll();
        personRepository.deleteAll();
        userRepository.deleteAll();
        itemCatalogRepository.deleteAll();
    }
    @Test
    public void testGetAll() throws Exception{
        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        itemCatalogRepository.save(itemCatalog);
        InvoiceItem item = RepositoryTestHelper.createItem(itemCatalog);
        Person person = RepositoryTestHelper.createPerson(PersonType.PRIVATE, new PersonAddress(), new BankAccount());
        Long userLogin = userService.createUserLogin("test", "test12345");
        personService.savePerson(person, "test");

        Invoice invoice =RepositoryTestHelper.createInvoice(item, person, person);

        invoiceDataRepository.save(invoice);
        List<Invoice> invoiceDataList = invoiceDataRepository.findAll();
        Assertions.assertEquals(1, invoiceDataList.size());
        Assertions.assertEquals(1, invoiceDataList.get(0).getInvoiceItems().size());
    }



}