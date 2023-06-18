package com.pr.ordermanager.person.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.person.model.PersonFormModel;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.person.service.PersonModelToEntityMapperHelper;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.security.Principal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @created 21.09.2020 - 15:14
 */

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
@Import( TestServicesConfiguration.class )
class PersonControllerTest {

    @LocalServerPort
    private int port;


    @Autowired
    PersonController personController;
    @Autowired
    UserService userService;
    @Autowired
    PersonRepository personRepository;
    @Autowired
    UserRepository userRepository;


    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
        userRepository.deleteAll();
    }
    @AfterEach
    void tearDown(){
        personRepository.deleteAll();
        userRepository.deleteAll();
    }

    ObjectMapper mapper = PersonModelToEntityMapperHelper.createObjectMapper();

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
        userService.createUserLogin("admin","test12345");
        RequestEntity<PersonFormModel> request = RequestEntity
                .put(new URI("http://localhost:"+port+"/backend/person"))
                .header("Authorization","Basic YWRtaW46dGVzdDEyMzQ1")
                .header("Content-Type", "application/json")
                .accept( MediaType.APPLICATION_JSON)
                .body(personFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody().getCreatedId () > 0);

    }

}