package com.pr.ordermanager.person.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.report.service.ModelToEntityMapperHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.security.Principal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * @author Oleksandr Prognimak
 * @created 21.09.2020 - 15:14
 */
class PersonControllerTest {

    @LocalServerPort
    private int port;


    @Autowired
    PersonController personController;



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
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("admin");

        PersonFormModel personFormModel = RepositoryTestHelper.createTestPersonFormModel();
        String json = mapper.writeValueAsString(personFormModel);
        ResponseEntity<CreatedResponse> responseResponseEntity =
                personController.putNewPerson ( personFormModel, principal );
        assertEquals(HttpStatus.CREATED,responseResponseEntity.getStatusCode());
        assertTrue (responseResponseEntity.getBody().getCreatedId ()>0);
    }

    @Test
    void putNewPersonHttp()  throws Exception{
        PersonFormModel personFormModel = RepositoryTestHelper.createTestPersonFormModel();
        RequestEntity<PersonFormModel> request = RequestEntity
                .put(new URI("http://localhost:"+port+"/backend/person"))
                .accept( MediaType.APPLICATION_JSON)
                .body(personFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody().getCreatedId ()>0);

    }

}