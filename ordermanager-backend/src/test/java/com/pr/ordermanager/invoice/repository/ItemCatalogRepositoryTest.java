package com.pr.ordermanager.invoice.repository;

import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
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
class ItemCatalogRepositoryTest {

    @Autowired
    private ItemCatalogRepository itemCatalogRepository;

    @BeforeEach
    @Transactional
    public void setUp(){

        itemCatalogRepository.save(ItemCatalog.builder().description("Test item1 description 1111.")
                .shortDescription("Item 1111").itemPrice(100D).vat(19).build());
        itemCatalogRepository.save(ItemCatalog.builder().description("Test item2 shortDescription 2222.")
                .shortDescription("Item 2222").itemPrice(200D).vat(19).build());
    }

    @AfterEach
    @Transactional
    public void tearDown() {
        itemCatalogRepository.deleteAll();
    }

    @Test
    void findByDescriptionOrShortDescription() {
        String criteria = "1111";
        List<ItemCatalog> itemCatalogs =
                itemCatalogRepository.findByDescriptionContainingOrShortDescriptionContaining(criteria, criteria);
        assertEquals(1, itemCatalogs.size());
        assertEquals(100D, itemCatalogs.get(0).getItemPrice());

        criteria = "2222";
        itemCatalogs = itemCatalogRepository.findByDescriptionContainingOrShortDescriptionContaining(criteria, criteria);

        assertEquals(1, itemCatalogs.size());
        assertEquals(200D, itemCatalogs.get(0).getItemPrice());

        criteria = "Item";
        itemCatalogs = itemCatalogRepository.findByDescriptionContainingOrShortDescriptionContaining(criteria, criteria);

        assertEquals(2, itemCatalogs.size());
        assertEquals(100D, itemCatalogs.get(0).getItemPrice());
        assertEquals(200D, itemCatalogs.get(1).getItemPrice());

        criteria = "5555555";
        itemCatalogs = itemCatalogRepository.findByDescriptionContainingOrShortDescriptionContaining(criteria, criteria);
        assertEquals(0, itemCatalogs.size());
    }
}