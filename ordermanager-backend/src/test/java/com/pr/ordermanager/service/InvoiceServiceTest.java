package com.pr.ordermanager.service;

import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import com.pr.ordermanager.invoice.service.InvoiceService;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.PersonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import( {TestServicesConfiguration.class, TestServiceHelper.class})
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
    private TestServiceHelper testServiceHelper;

    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
        invoiceRepository.deleteAll();

    }

    @AfterEach
    void tearDown() {
        personRepository.deleteAll();
        personRepository.deleteAll();
        itemCatalogRepository.deleteAll();
    }


    @Test
    void saveInvoice() {
        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        itemCatalogRepository.save(itemCatalog);
        InvoiceItem item = RepositoryTestHelper.createItem(itemCatalog);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        Invoice invoice = RepositoryTestHelper.createInvoice ( item, personSupplier, personRecipient );
        invoiceService.saveInvoice (invoice, "admin");
        Assertions.assertNotNull (invoice);

    }



    @Test
    void getInvoiceByInvoiceNumber() {
    }

    @Test
    void getAllData() {
        String pw_hash = BCrypt.hashpw("alexadmin", BCrypt.gensalt(10));
        System.out.println(pw_hash);
    }

}