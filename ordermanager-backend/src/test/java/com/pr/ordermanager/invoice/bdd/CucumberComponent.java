package com.pr.ordermanager.invoice.bdd;

import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.security.service.UserAuthProvider;
import com.pr.ordermanager.security.service.UserService;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static io.cucumber.spring.CucumberTestContext.SCOPE_CUCUMBER_GLUE;

@Component
@Scope(SCOPE_CUCUMBER_GLUE)
@Getter
public class CucumberComponent {
    @Autowired
    ItemCatalogRepository catalogRepository;

    @Autowired
    PersonRepository personRepository;

    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    UserService userService;
    @Autowired
    UserAuthProvider authProvider;

    private TestRestTemplate restTemplate = new TestRestTemplate();


    public ItemCatalogRepository getCatalogRepository() {
        return catalogRepository;
    }

    public InvoiceRepository getInvoiceRepository() {
        return invoiceRepository;
    }

    @Transactional
    public void saveAllItemCatalog(List<ItemCatalog> catalogList) {
        catalogRepository.saveAll(catalogList);
    }

    @Transactional
    public void savePerson(Person person) {
        personRepository.save(person);
    }


}
