package com.pr.ordermanager.invoice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServiceHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.person.service.PersonModelToEntityMapperHelper;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserAuthProvider;
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
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @since 21.09.2020 - 15:23
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
@Import( {TestServicesConfiguration.class , TestServiceHelper.class})
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
    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    ItemCatalogRepository itemCatalogRepository;
    @Autowired
    UserService userService;
    @Autowired
    UserRepository userRepository;
    @Autowired
    UserAuthProvider authProvider;

    @BeforeEach
    void setUp() {

    }
    @AfterEach
    void tearDown(){
        personRepository.deleteAll();
        itemCatalogRepository.deleteAll();
        userRepository.deleteAll();
        invoiceRepository.deleteAll();

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
        assertTrue (responseEntity.getBody ().getCreatedId () > 0);
    }

    @Test
    void putNewInvoiceHttp()  throws Exception{

        assertNotNull(invoiceController);

        Person personSupplier = testServiceHelper.personSupplier();
        Person personRecipient = testServiceHelper.personRecipient();
        ItemCatalog itemCatalog = testServiceHelper.createItemCatalog();
        InvoiceUser invoiceUser = userService.createUserLogin("test123", "test12345");
        String token = authProvider.createToken(invoiceUser);

        InvoiceFormModel invoiceFormModel =
                RepositoryTestHelper.createInvoiceFormModel(personSupplier.getId (), personRecipient.getId());

        invoiceFormModel.getInvoiceItems().get(0).setCatalogItemId(itemCatalog.getId());
        String json = mapper.writeValueAsString(invoiceFormModel);
        System.out.println(json);
       // if( true ) return;
        RequestEntity<InvoiceFormModel> request = RequestEntity
                .put(new URI("http://localhost:"+port+"/backend/invoice"))
                .header("Authorization","Bearer " + token)
                .header("Content-Type", "application/json")
                .accept( MediaType.APPLICATION_JSON)
                .body(invoiceFormModel);

        ResponseEntity<CreatedResponse> responseEntity = restClient.exchange(request,CreatedResponse.class);
        assertEquals(HttpStatus.CREATED,responseEntity.getStatusCode());
        assertTrue (responseEntity.getBody ().getCreatedId ()>0);
        Invoice invoice = invoiceRepository.findById(responseEntity.getBody().getCreatedId()).get();
        assertNotNull(invoice);
    }

    @Test
    void getInvoice() {
      System.out.println(doubleToString(198.986543D));

    }

    public static final String doubleToString(final Double doubleValue) {
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance();
        symbols.setDecimalSeparator(',');
        final DecimalFormat decimalFormat = new DecimalFormat("00000,00", symbols);
        final double value = doubleValue == null ? 0d : doubleValue;
        return decimalFormat.format(value);
    }


}