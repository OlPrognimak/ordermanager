package com.pr.ordermanager.invoice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.person.service.PersonModelToEntityMapperHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.security.Principal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @created 21.09.2020 - 15:23
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
@Import( TestServicesConfiguration.class )
//@Transactional
class InvoiceControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    InvoiceController invoiceController;
    @Autowired
    PersonRepository personRepository;
    @Autowired
    TestServiceHelper testServiceHelper;


    @BeforeEach
    void setUp() {

    }
    @AfterEach
    void tearDown(){
        //personRepository.deleteAll();
    }

    ObjectMapper mapper = PersonModelToEntityMapperHelper.createObjectMapper();

    @Autowired
    RestTemplate restClient;

    @Test
    void putNewInvoice() {
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("admin");

        assertNotNull(invoiceController);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        ItemCatalog itemCatalog = testServiceHelper.createItemCatalog();

        InvoiceFormModel invoiceFormModel =
                RepositoryTestHelper.createInvoiceFormModel (personSupplier.getId (), personRecipient.getId ());
        invoiceFormModel.getInvoiceItems().get(0).setCatalogItemId(itemCatalog.getId());
        final ResponseEntity<CreatedResponse> responseEntity =
                invoiceController.putNewInvoice ( invoiceFormModel, principal);

        assertEquals(HttpStatus.CREATED, responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody ().getCreatedId ()>0);
    }

    @Test
    void putNewInvoiceHttp()  throws Exception{

        assertNotNull(invoiceController);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        ItemCatalog itemCatalog = testServiceHelper.createItemCatalog();

        InvoiceFormModel invoiceFormModel =
                RepositoryTestHelper.createInvoiceFormModel(personSupplier.getId (), personRecipient.getId());
        invoiceFormModel.getInvoiceItems().get(0).setCatalogItemId(itemCatalog.getId());
        String json = mapper.writeValueAsString(invoiceFormModel);
        System.out.println(json);
        if( true ) return;
        HttpHeaders httpHeaders = new HttpHeaders();
        RequestEntity<InvoiceFormModel> request = RequestEntity
                .put(new URI("http://localhost:"+port+"/backend/invoice")).header("Authorization","Basic YWRtaW46dGVzdDEyMzQ1")
                .accept( MediaType.APPLICATION_JSON)
                .body(invoiceFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody ().getCreatedId ()>0);
    }

    @Test
    void getInvoice() {
    }

}