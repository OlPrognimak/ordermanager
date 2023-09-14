package com.pr.ordermanager.invoice.service;

import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import javax.transaction.Transactional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;


@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import( {TestServicesConfiguration.class, TestServiceHelper.class} )
@Transactional
class InvoiceServiceTest {

    @Autowired
    InvoiceService invoiceService;
    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    private ItemCatalogRepository itemCatalogRepository;

    @BeforeEach
    @Transactional
    public void setUp() {
        invoiceService.saveItemCatalog(ItemCatalog.builder().description("Test item1 description 1111.")
                .shortDescription("Item 1111").itemPrice(100D).vat(19).build());
        invoiceService.saveItemCatalog(ItemCatalog.builder().description("Test item2 shortDescription 2222.")
                .shortDescription("Item 2222").itemPrice(200D).vat(19).build());
    }

    @AfterEach
    @Transactional
    public void tearDown() {
        invoiceRepository.deleteAll();
        itemCatalogRepository.deleteAll();
    }

    @Test
    void getCatalogItemsList() {
        String criteria = "1111";
        List<ItemCatalog> catalogItemsList = invoiceService.getCatalogItemsList(criteria);
        assertEquals(1, catalogItemsList.size());

        criteria = "2222";
        catalogItemsList = invoiceService.getCatalogItemsList(criteria);
        assertEquals(1, catalogItemsList.size());

        criteria = "Item";
        catalogItemsList = invoiceService.getCatalogItemsList(criteria);
        assertEquals(2, catalogItemsList.size());

        criteria = null;
        catalogItemsList = invoiceService.getCatalogItemsList(criteria);
        assertEquals(2, catalogItemsList.size());

    }

    @Test
    void getCatalogItemsListNoResult() {
        String criteria = "5555";
        OrderManagerException exception =
                assertThrows(OrderManagerException.class,
                        () -> invoiceService.getCatalogItemsList(criteria));
        assertEquals("Can not find catalog items by criteria :5555",
                exception.getMessage());

    }
}