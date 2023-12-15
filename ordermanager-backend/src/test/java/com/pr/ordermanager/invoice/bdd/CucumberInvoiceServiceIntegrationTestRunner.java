package com.pr.ordermanager.invoice.bdd;

import io.cucumber.junit.Cucumber;
import io.cucumber.junit.CucumberOptions;
import org.junit.runner.RunWith;

@RunWith(Cucumber.class)
@CucumberOptions(features = {/*"classpath:create-user.feature", */"classpath:invoice-service.feature"}, extraGlue = {"com.pr.ordermanager.invoice.bdd"})
public class CucumberInvoiceServiceIntegrationTestRunner {
}
