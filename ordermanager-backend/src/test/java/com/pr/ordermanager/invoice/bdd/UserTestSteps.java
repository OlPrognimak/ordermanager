package com.pr.ordermanager.invoice.bdd;

import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.util.MultiValueMap;

import java.net.URI;
import java.net.URISyntaxException;

public class UserTestSteps {
    @Autowired
    private CucumberComponent cucumberComponent;

    private String userName;
    private String password;

    @LocalServerPort
    private int backendPort;


    @Given("user fills UI form with user name {string} and password {string}")
    public void user_fills_ui_form_with_user_name_and_password(String userName, String password) {
       this.userName = userName;
       this.password = password;
    }
    @When("user click save button {string}")
    public void user_click_save_button(String string) throws URISyntaxException {
        URI uri = new URI("http://localhost:".concat(String.valueOf(backendPort)).concat("/backend/registration"));
        MultiValueMap<String, String> headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, "application/json");
        headers.add("User-Name", userName);
        headers.add("User-Password", password);

        RequestEntity<InvoiceFormModel> entity = new RequestEntity(headers, HttpMethod.POST, uri);
        cucumberComponent.getRestTemplate().exchange(entity, CreatedResponse.class);
    }
    @Then("the backend response with user id and HTTP status status {string}")
    public void the_backend_response_with_user_id_and_http_status_status(String string) {
        // Write code here that turns the phrase above into concrete actions
        throw new io.cucumber.java.PendingException();
    }
}
