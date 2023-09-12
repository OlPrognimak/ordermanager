package com.pr.ordermanager.invoice.repository;

import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
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
class InvoiceItemRepositoryTest {
    @Autowired
    InvoiceItemRepository invoiceItemRepository;
    @Autowired
    ItemCatalogRepository itemCatalogRepository;



    @BeforeEach
    void setUp() {
        invoiceItemRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        invoiceItemRepository.deleteAll();
    }
    @Test
    public void testGetAll() throws Exception{

        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        itemCatalogRepository.save(itemCatalog);
        InvoiceItem item = RepositoryTestHelper.createItem(itemCatalog);
        invoiceItemRepository.save(item);
        List<InvoiceItem> invoiceItems = invoiceItemRepository.findAll();
        Assertions.assertEquals(1, invoiceItems.size());

    }
}