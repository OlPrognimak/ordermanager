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
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserService;
import org.junit.jupiter.api.AfterEach;
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

import static org.junit.jupiter.api.Assertions.assertEquals;


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
        Invoice invoice = createTestInvoice();

        invoiceDataRepository.save(invoice);
        List<Invoice> invoiceDataList = invoiceDataRepository.findAll();
        assertEquals(1, invoiceDataList.size());
        assertEquals(1, invoiceDataList.get(0).getInvoiceItems().size());
    }


    @Test
    void findInvoiceByInvoiceUserIdAndInvoiceNumber() {
        final String invoiceNumber = "555555";
        Invoice invoice = createTestInvoice();
        invoice.setInvoiceNumber(invoiceNumber);
        invoiceDataRepository.save(invoice);
        Long userId = invoice.getInvoiceUser().getId();

        Invoice invoiceResult = invoiceDataRepository.findInvoiceByInvoiceUserIdAndInvoiceNumber(userId, invoiceNumber);
        assertEquals(invoiceNumber, invoiceResult.getInvoiceNumber());

    }


    @Test
    void  findInvoiceByInvoiceUserNameAndInvoiceNumber() {
        final String invoiceNumber = "777777";
        Invoice invoice = createTestInvoice();
        String userName = "test";
        invoice.setInvoiceNumber(invoiceNumber);

        Invoice invoiceResult = invoiceDataRepository.findInvoiceByInvoiceUserUsernameAndInvoiceNumber(userName, invoiceNumber);

        assertEquals(invoiceNumber, invoiceResult.getInvoiceNumber());
    }

    private Invoice createTestInvoice() {
        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        itemCatalogRepository.save(itemCatalog);
        InvoiceItem item = RepositoryTestHelper.createItem(itemCatalog);
        Person person = RepositoryTestHelper.createPerson(PersonType.PRIVATE, new PersonAddress(), new BankAccount());
        Long userId = userService.createUserLogin("test", "test12345");
        InvoiceUser invoiceUser = userRepository.findById(userId).get();
        person.setInvoiceUser(invoiceUser);
        personService.savePerson(person, "test");

        Invoice invoice =RepositoryTestHelper.createInvoice(item, person, person, invoiceUser);
        return invoice;
    }



}