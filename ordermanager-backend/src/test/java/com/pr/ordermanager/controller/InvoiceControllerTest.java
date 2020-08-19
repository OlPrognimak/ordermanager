package com.pr.ordermanager.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.repository.jpa.PersonInvoiceRepository;
import com.pr.ordermanager.service.ModelToEntityMapper;
import java.net.URI;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(locations = "classpath:testapplication.properties")
@Transactional
class InvoiceControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    InvoiceController invoiceController;
    @Autowired
    PersonInvoiceRepository personInvoiceRepository;

    @BeforeEach
    void setUp() {
        personInvoiceRepository.deleteAll();
    }
    ObjectMapper mapper = ModelToEntityMapper.createObjectMapper();

    @Autowired
    RestTemplate restClient;

    @Test
    void putNewInvoice() {

        assertNotNull(invoiceController);
        InvoiceFormModel invoiceFormModel = RepositoryTestHelper.createInvoiceFormModel();
        final ResponseEntity<String> stringResponseEntity = invoiceController.putNewInvoice(invoiceFormModel);
        Assertions.assertNotNull(stringResponseEntity);
        assertEquals(HttpStatus.CREATED, stringResponseEntity.getStatusCode());
    }

    @Test
    void putNewInvoiceHttp()  throws Exception{

        assertNotNull(invoiceController);
        InvoiceFormModel invoiceFormModel = RepositoryTestHelper.createInvoiceFormModel();
        String json = mapper.writeValueAsString(invoiceFormModel);
        RequestEntity<InvoiceFormModel> request = RequestEntity
            .put(new URI("http://localhost:"+port+"/backend/invoicebackend"))
            .accept(MediaType.APPLICATION_JSON)
            .body(invoiceFormModel);
        ResponseEntity<String> response = restClient.exchange(request,String.class);
        Assertions.assertEquals(HttpStatus.CREATED,response.getStatusCode());
        //Assertions.assertEquals("[successful]",response.getBody());
    }

    @Test
    void getInvoice() {
    }

}