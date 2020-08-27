package com.pr.ordermanager.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.controller.model.CreatedResponse;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.controller.model.PersonFormModel;
import com.pr.ordermanager.jpa.entity.Person;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.repository.jpa.PersonRepository;
import com.pr.ordermanager.service.ModelToEntityMapperHelper;
import java.net.URI;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(locations = "classpath:testapplication.properties")
@Import ( TestServicesConfiguration.class )
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

    ObjectMapper mapper = ModelToEntityMapperHelper.createObjectMapper();

    @Autowired
    RestTemplate restClient;

    @Test
    void putNewInvoice() {

        assertNotNull(invoiceController);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        InvoiceFormModel invoiceFormModel =
            RepositoryTestHelper.createInvoiceFormModel (personSupplier.getId (), personRecipient.getId ());
        final ResponseEntity<CreatedResponse> responseEntity =
            invoiceController.putNewInvoice ( invoiceFormModel );

        assertEquals(HttpStatus.CREATED, responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody ().getCreatedId ()>0);
    }

    @Test
    void putNewInvoiceHttp()  throws Exception{

        assertNotNull(invoiceController);
        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        InvoiceFormModel invoiceFormModel =
            RepositoryTestHelper.createInvoiceFormModel (personSupplier.getId (), personRecipient.getId ());
        String json = mapper.writeValueAsString(invoiceFormModel);
        RequestEntity<InvoiceFormModel> request = RequestEntity
            .put(new URI ("http://localhost:"+port+"/backend/invoice"))
            .accept( MediaType.APPLICATION_JSON)
            .body(invoiceFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody ().getCreatedId ()>0);
    }


    @Test
    void putNewPerson()  throws Exception{
        /*
        PersonAddress personAddress = RepositoryTestHelper.createPersonAddress (
            "Köln", "Kölner Str.55", null, "5454" );
        BankAccount bankAccount = RepositoryTestHelper.createBankAccount (
            "DE99 1234 1234 1234 1234 1", "Test Bank Name" );
        Person person = RepositoryTestHelper.createPerson (
            PersonType.ORGANISATION,
            personAddress, bankAccount );
        */
        PersonFormModel personFormModel = RepositoryTestHelper.createTestPersonFormModel();
        String json = mapper.writeValueAsString(personFormModel);
        ResponseEntity<CreatedResponse> responseResponseEntity = invoiceController.putNewPerson ( personFormModel );
        assertEquals(HttpStatus.CREATED,responseResponseEntity.getStatusCode());
        assertTrue (responseResponseEntity.getBody().getCreatedId ()>0);
    }

    @Test
    void putNewPersonHttp()  throws Exception{
        PersonFormModel personFormModel = RepositoryTestHelper.createTestPersonFormModel();
        RequestEntity<PersonFormModel> request = RequestEntity
            .put(new URI ("http://localhost:"+port+"/backend/person"))
            .accept( MediaType.APPLICATION_JSON)
            .body(personFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody().getCreatedId ()>0);

    }

    @Test
    void getInvoice() {
    }

}