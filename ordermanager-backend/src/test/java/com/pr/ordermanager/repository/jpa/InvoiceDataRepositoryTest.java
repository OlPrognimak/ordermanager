package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.invoice.repository.InvoiceItemRepository;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;

@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
class InvoiceDataRepositoryTest {
    /*
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;
    */
    @Autowired private EntityManager entityManager;

    @Autowired
    InvoiceRepository invoiceDataRepository;
    @Autowired
    InvoiceItemRepository invoiceItemRepository;

    @BeforeEach
    void setUp() {
        invoiceDataRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        invoiceDataRepository.deleteAll();
    }
    @Test
    public void testGetAll() throws Exception{
       // Assertions.assertNotNull(testService);
//        InvoiceItem item = RepositoryTestHelper.createItem();
//        Invoice data =RepositoryTestHelper.createInvoice(item);
//        invoiceDataRepository.save(data);
//        List<Invoice> invoiceDataList = invoiceDataRepository.findAll();
//        Assertions.assertEquals(1, invoiceDataList.size());
//        Assertions.assertEquals(1, invoiceDataList.get(0).getInvoiceItems().size());
    }



}