package com.pr.ordermanager;

import com.pr.ordermanager.jpa.entity.*;
import com.pr.ordermanager.repository.RepositoryTestHelper;
import com.pr.ordermanager.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class TestServiceHelper {

    @Autowired
    private InvoiceService invoiceService;

    public ItemCatalog createItemCatalog(){
        ItemCatalog itemCatalog = RepositoryTestHelper.createItemCatalog();
        invoiceService.saveItemCatalog(itemCatalog);
        return itemCatalog;
    }


    public Person personRecipient(){
        PersonAddress personRecipientAddress =
            RepositoryTestHelper.createPersonAddress(
                "Köln", "Kölner str.", null,"55555");

        BankAccount bankRecipientAccount =
            RepositoryTestHelper.createBankAccount(
                "DE44 5555 5555 5555 5555 5", "Receiver  Bank");
        Person personRecipient =
            RepositoryTestHelper.createPerson (
                PersonType.PRIVATE, personRecipientAddress, bankRecipientAccount );

        invoiceService.savePerson ( personRecipient );

        return personRecipient;
    }

    public Person personSupplier(){
        PersonAddress personSuplierAddress =
            RepositoryTestHelper.createPersonAddress (
                "Bonn", "Bonner str.", "12345", null );

        BankAccount bankSupplierAccount =
            RepositoryTestHelper.createBankAccount (
                "DE55 4444 4444 4444 4444 4", "Supplier Bank" );
        Person personSupplier =
            RepositoryTestHelper.createPerson (
                PersonType.PRIVATE, personSuplierAddress, bankSupplierAccount );

        invoiceService.savePerson ( personSupplier );

        return personSupplier;
    }
}
