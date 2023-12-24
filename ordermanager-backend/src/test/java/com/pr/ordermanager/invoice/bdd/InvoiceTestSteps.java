package com.pr.ordermanager.invoice.bdd;

import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.security.entity.InvoiceUser;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.After;
import io.cucumber.java.DataTableType;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import lombok.extern.java.Log;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

@Log
public class InvoiceTestSteps {

    @Autowired
    private CucumberComponent cucumberComponent;

    private InvoiceFormModel invoiceModel;
    private List<ItemCatalog> itemCatalogList;

    private Person invoiceCreatorPerson;
    private Person invoiceRecipientPerson;
    private String token;

    private ResponseEntity<CreatedResponse>  response;

    @LocalServerPort
    private int backendPort;
    @After
    @Transactional
    public void tearDown() {
        cucumberComponent.getInvoiceRepository().deleteAll();
        cucumberComponent.getCatalogRepository().deleteAll();
        cucumberComponent.getPersonRepository().deleteAll();
        cucumberComponent.getUserRepository().deleteAll();
        log.log(Level.FINE, "Delete all data after tests.");
    }

    @DataTableType
    public ItemCatalog itemCatalogEntry(Map<String, String> entry) {
        return  ItemCatalog.builder()
                .itemPrice(Double.valueOf(entry.get("itemPrice")))
                .vat(Integer.valueOf(entry.get("vat")))
                .description((String) entry.get("description"))
                .shortDescription((String) entry.get("shortDescription"))
                .build();
    }

    @DataTableType
    public Person person(Map<String, String> entry) {
        return Person.builder()
                .companyName(entry.get("companyName"))
                .email(entry.get("email"))
                .personType(PersonType.valueOf(entry.get("personType")))
                .personLastName(entry.get("personLastName"))
                .personFirstName(entry.get("personFirstName"))
                .taxNumber(entry.get("taxNumber"))
                .build();
    }

    @DataTableType
    public InvoiceFormModel invoiceFormModel(Map<String, String> entry){
        try {
            return InvoiceFormModel.builder()
                    .invoiceNumber(entry.get("invoiceNumber"))
                    .invoiceDescription(entry.get("invoiceDescription"))
                    .invoiceDate(OffsetDateTime.parse(entry.get("invoiceDate")))
                    .creationDate(OffsetDateTime.parse(entry.get("creationDate")))
                    .rateType(entry.get("rateType"))
                    .totalSumNetto(Double.valueOf(entry.get("totalSumNetto")))
                    .totalSumBrutto(Double.valueOf(entry.get("totalSumBrutto")))
                    .invoiceItems(new ArrayList<>())
                    .build();
        } catch (Throwable t) {
            log.log(Level.SEVERE, "Error type conversion.", t);
            throw new RuntimeException();
        }

    }

    @DataTableType
    public PersonAddress personAddress(Map<String, String> entry) {
        return PersonAddress.builder()
                .postBoxCode(entry.get("postBoxCode"))
                .street(entry.get("street"))
                .zipCode(entry.get("zipCode"))
                .city(entry.get("city"))
                .build();
    }
    @DataTableType
    public BankAccount bankAccount(Map<String, String> entry) {
        return BankAccount.builder()
                .bankName(entry.get("bankName"))
                .accountNumber(entry.get("accountNumber"))
                .bicSwift(entry.get("bicSwift"))
                .iban(entry.get("iban"))
                .build();
    }

    @Given("there are two invoice catalog item")
    public void there_are_two_invoice_catalog_item(DataTable dataTable) {
        itemCatalogList = dataTable.asList(ItemCatalog.class);
        cucumberComponent.saveAllItemCatalog(itemCatalogList);
        assertNotNull(itemCatalogList.get(0).getId());
        assertNotNull(itemCatalogList.get(1).getId());
    }

    @Given("there is a person invoice creator")
    public void there_is_a_person_invoice_creator(DataTable dataTable) {
        invoiceCreatorPerson = dataTable.convert(Person.class, false);
        invoiceCreatorPerson.setPersonAddress(new ArrayList<>());
        invoiceCreatorPerson.setBankAccount(new ArrayList<>());
    }

    @Given("invoice creator has an address")
    public void invoice_creator_has_an_address(DataTable dataTable) {
        PersonAddress personAddress = dataTable.convert(PersonAddress.class, false);
        invoiceCreatorPerson.getPersonAddress().add(personAddress);
    }

    @Given("invoice creator has a bank account")
    public void invoice_creator_has_a_bank_account(DataTable dataTable) {
        BankAccount bankAccount = dataTable.convert(BankAccount.class, false);
        invoiceCreatorPerson.getBankAccount().add(bankAccount);
        cucumberComponent.savePerson(invoiceCreatorPerson);
        assertNotNull(invoiceCreatorPerson.getId());
        assertNotNull(invoiceCreatorPerson.getPersonAddress().get(0).getId());
        assertNotNull(invoiceCreatorPerson.getBankAccount().get(0).getId());

    }

    @Given("there is a person invoice recipient")
    public void there_is_a_person_invoice_recipient(DataTable dataTable) {
        invoiceRecipientPerson = dataTable.convert(Person.class, false);
        invoiceRecipientPerson.setPersonAddress(new ArrayList<>());
        invoiceRecipientPerson.setBankAccount(new ArrayList<>());
    }

    @Given("invoice recipient has an address")
    public void invoice_recipient_has_an_address(DataTable dataTable) {
        PersonAddress personAddress = dataTable.convert(PersonAddress.class, false);
        invoiceRecipientPerson.getPersonAddress().add(personAddress);
    }

    @Given("invoice recipient has a bank account")
    public void invoice_recipient_has_a_bank_account(DataTable dataTable) {
        BankAccount bankAccount = dataTable.convert(BankAccount.class, false);
        invoiceRecipientPerson.getBankAccount().add(bankAccount);
        cucumberComponent.savePerson(invoiceRecipientPerson);
        assertNotNull(invoiceRecipientPerson.getId());
        assertNotNull(invoiceRecipientPerson.getPersonAddress().get(0).getId());
        assertNotNull(invoiceRecipientPerson.getBankAccount().get(0).getId());
    }


    @Given("user fills invoice fields in form")
    public void user_fills_invoice_fields_in_form(DataTable dataTable) {
        invoiceModel = dataTable.convert(InvoiceFormModel.class, false);
    }
    @Given("select creator and recipient persons")
    public void select_creator_and_recipient_persons() {
        invoiceModel.setPersonRecipientId(invoiceRecipientPerson.getId());
        invoiceModel.setPersonSupplierId(invoiceCreatorPerson.getId());
    }
    @Given("fills invoice items {string} with {double} amount and {string} with {double} amount")
    public void fills_invoice_items_with_amount_and_with_amount(String name1, Double firstItemAmount, String name2, Double secondItemAmount) {

        invoiceModel.getInvoiceItems().add(createModelItem(0, firstItemAmount));
        invoiceModel.getInvoiceItems().add(createModelItem(1, secondItemAmount));

    }

    private InvoiceItemModel createModelItem(int itemNumber, Double itemAmount) {
        double nettoSum =  BigDecimal.valueOf(itemCatalogList.get(itemNumber).getItemPrice() * itemAmount).doubleValue();
        double bruttoSum = nettoSum + (nettoSum *  itemCatalogList.get(itemNumber).getVat());

        // Write code here that turns the phrase above into concrete actions
        return InvoiceItemModel.builder()
                .catalogItemId(itemCatalogList.get(itemNumber).getId())
                .itemPrice(itemCatalogList.get(itemNumber).getItemPrice())
                .amountItems(itemAmount)
                .vat(itemCatalogList.get(itemNumber).getVat())
                .sumNetto(nettoSum)
                .sumBrutto(bruttoSum)
                .build();
    }

    @Given("creates user {string} and password {string} and JWT token")
    public void creates_user_and_password_and_jwt_token(String userName, String password) {
        InvoiceUser invoiceUser = this.cucumberComponent.getUserService().createUserLogin("test123", "test12345");
        token = this.cucumberComponent.getAuthProvider().createToken(invoiceUser);
        log.log(Level.FINE, "T O K E N :"+ token);
    }

    @When("user click save button")
    public void user_click_save_button() throws URISyntaxException {
        // Write code here that turns the phrase above into concrete actions
        URI uri = new URI("http://localhost:".concat(String.valueOf(backendPort)).concat("/backend/invoice"));
        MultiValueMap<String, String> headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, "application/json");
        headers.add(HttpHeaders.AUTHORIZATION, "Bearer "+token);

        RequestEntity<InvoiceFormModel> entity = new RequestEntity(invoiceModel, headers, HttpMethod.PUT, uri);
        response = cucumberComponent.getRestTemplate().exchange(entity, CreatedResponse.class);
    }
    @Then("the server should have {int} invoice in the database and return http status {int}")
    public void the_server_should_have_invoice_in_the_database_and_return_http_status(Integer countInvoices, Integer statusCode) {
        assertEquals(statusCode.intValue(), response.getStatusCode().value());
        assertEquals(countInvoices.intValue(), cucumberComponent.getInvoiceRepository().findAll().size());
    }
}
