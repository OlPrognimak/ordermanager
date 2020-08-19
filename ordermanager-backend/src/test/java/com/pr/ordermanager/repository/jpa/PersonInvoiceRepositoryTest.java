package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
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
class PersonInvoiceRepositoryTest {
    @Autowired
    PersonInvoiceRepository personInvoiceRepository;


    @BeforeEach
    void setUp() {
        personInvoiceRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        personInvoiceRepository.deleteAll();
    }

    @Test
    public void testGetAll() throws Exception {
        InvoiceItem item = RepositoryTestHelper.createItem();
        InvoiceData data = RepositoryTestHelper.createInvoiceData(item);
        PersonInvoice personInvoices = RepositoryTestHelper.createPersonInvoices(data);
        personInvoiceRepository.save(personInvoices);
        List<PersonInvoice> personInvoiceList = personInvoiceRepository.findAll();
        Assertions.assertEquals(1, personInvoiceList.size());
        Assertions.assertEquals(1, personInvoiceList.get(0).getInvoices().size());
        Assertions.assertEquals(1, personInvoiceList.get(0).getInvoices().get(0).getInvoiceItems().size());
    }

}