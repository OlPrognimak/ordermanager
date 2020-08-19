package com.pr.ordermanager.service;

import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.repository.jpa.PersonInvoiceRepository;
import org.junit.Assert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
public class InvoicePersonServiceTest {

    @Autowired
    private InvoicePersonService invoicePersonService;
    @Autowired
    private PersonInvoiceRepository personInvoiceRepository;



    @BeforeEach
    void setUp() {
        personInvoiceRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
       // personInvoiceRepository.deleteAll();
    }

    @Test
    void savePersonInvoice() {
        InvoiceFormModel invoiceFormModel = RepositoryTestHelper.createInvoiceFormModel();
        PersonInvoice personInvoice =
            ModelToEntityMapper.mapModelToEntityPersonInvoice(invoiceFormModel);
        invoicePersonService.savePersonInvoice(personInvoice);

        final InvoiceData invoiceData = invoicePersonService.getInvoice("POST-2020-0006");
        PersonInvoice personInvoiceResult = invoiceData.getPersonInvoice();

        //invoiceData.getInvoiceItems()
        Assert.assertNotNull(personInvoiceResult);
        Assert.assertEquals(1,personInvoiceResult.getInvoices().size());
        Assert.assertNotNull(invoiceData);
        Assert.assertNotNull(invoiceData.getPersonInvoice());
        Assert.assertEquals(1,invoiceData.getInvoiceItems().size());


    }

    @Test
    void saveInvoiceData() {


    }

    @Test
    void getInvoiceByInvoiceNumber() {
    }

    @Test
    void getAllData() {
    }

}