package com.pr.ordermanager.service;

import com.pr.ordermanager.controller.model.InvoiceFormModel;
import com.pr.ordermanager.jpa.entity.InvoiceData;
import com.pr.ordermanager.jpa.entity.InvoiceItem;
import com.pr.ordermanager.jpa.entity.PersonInvoice;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import org.junit.Assert;
import org.junit.jupiter.api.Test;

public class ModelToEntityMapperTest {

    @Test
   public void mapModelToEntityPersonInvoice() throws Exception{
        PersonInvoice personInvoice =
            ModelToEntityMapper.mapModelToEntityPersonInvoice(RepositoryTestHelper.createInvoiceFormModel());
        Assert.assertNotNull(personInvoice);
    }

    @Test
    public void mapEntityToPersonInvoiceModel() throws Exception{
        InvoiceItem item = RepositoryTestHelper.createItem();
        InvoiceData invoiceData = RepositoryTestHelper.createInvoiceData(item);
        PersonInvoice personInvoices = RepositoryTestHelper.createPersonInvoices(invoiceData);

        InvoiceFormModel invoiceFormModel = ModelToEntityMapper.mapEntityToFormModel(personInvoices);
        Assert.assertNotNull(invoiceFormModel);
    }

}