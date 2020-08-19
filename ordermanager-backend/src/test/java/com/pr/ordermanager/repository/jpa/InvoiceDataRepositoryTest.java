package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import java.util.List;
import javax.persistence.EntityManager;
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
class InvoiceDataRepositoryTest {
    /*
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;
    */
    @Autowired private EntityManager entityManager;

    @Autowired
    InvoiceDataRepository invoiceDataRepository;
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
        InvoiceItem item = RepositoryTestHelper.createItem();
        InvoiceData data =RepositoryTestHelper.createInvoiceData(item);
        invoiceDataRepository.save(data);
        List<InvoiceData> invoiceDataList = invoiceDataRepository.findAll();
        Assertions.assertEquals(1, invoiceDataList.size());
        Assertions.assertEquals(1, invoiceDataList.get(0).getInvoiceItems().size());
    }



}