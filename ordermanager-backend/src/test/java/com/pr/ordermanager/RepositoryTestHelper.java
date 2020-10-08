package com.pr.ordermanager;

import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.model.BankAccountFormModel;
import com.pr.ordermanager.person.model.PersonAddressFormModel;
import com.pr.ordermanager.person.model.PersonFormModel;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.UUID;

import static com.pr.ordermanager.invoice.entity.RateType.DAILY;

public class RepositoryTestHelper {
    private RepositoryTestHelper() {

    }

    public static Person createPerson(PersonType personType, PersonAddress personAddress, BankAccount bankAccount) {
        var person = Person.builder()
                .personFirstName("Oleksandr")
                .personLastName("Prognimak")
                .personType(personType)
                .personAddress(Arrays.asList(personAddress))
                .bankAccount(Arrays.asList(bankAccount))
                .taxNumber("" + System.currentTimeMillis())
                .email("test@test.de")
                .build();
        personAddress.setPersons(Arrays.asList(person));
        personAddress.setPersons(Arrays.asList(person));
        return person;

    }

    public static Invoice createInvoice(InvoiceItem item, Person personSupplier, Person personRecipient) {
        var invoice = new Invoice();
        invoice.setInvoiceItems(new ArrayList<>());
        invoice.getInvoiceItems().add(item);
        invoice.setInvoiceDate(OffsetDateTime.now());
        invoice.setCreationDate(OffsetDateTime.now());
        invoice.setInvoiceSupplierPerson(personSupplier);
        invoice.setInvoiceRecipientPerson(personRecipient);
        invoice.setRateType(DAILY);

        personSupplier.setInvoiceSuppliers(Arrays.asList(invoice));
        personRecipient.setInvoiceRecipient(Arrays.asList(invoice));

        return invoice;
    }


    public static PersonAddress createPersonAddress(String city, String street, String zipCode, String postBox) {
        return PersonAddress.builder()
                .city(city)
                .street(street)
                .zipCode(zipCode)
                .postBoxCode(postBox).build();
    }

    public static BankAccount createBankAccount(String iban, String bankName) {
        return BankAccount.builder()
                .iban(iban)
                .bankName(bankName).build();
    }


    public static ItemCatalog createItemCatalog(){
        return ItemCatalog.builder()
                 .description("Geleistete Tagen  im Monat gemäß beigefügten abgezeichneten Leistungsnachweisen")
                .itemPrice(87d)
                .shortDescription(UUID.randomUUID().toString())
                .vat(19).build();
    }


    public static InvoiceItem createItem(ItemCatalog itemCatalog) {
        var item = new InvoiceItem();
        item.setItemCatalog(itemCatalog);
        item.setAmountItems(22d);
        item.setItemPrice(600d);
        item.setVat(16);
        return item;
    }

    public static InvoiceItemModel createInvoiceItemModel() {
        return InvoiceItemModel.builder()
                .description("Geleistete Tagen  im Juni 2020 gemäß \n" +
                        "beigefügten abgezeichneten\n" +
                        "Leistungsnachweisen\n")
                .amountItems(22d)
                .itemPrice(600d)
                .vat(16).build();

    }

    public static InvoiceFormModel createInvoiceFormModel(Long personSupplierId, Long personRecipientId) {
        return InvoiceFormModel.builder()
                .invoiceNumber("InvNr_" + System.currentTimeMillis())
                .personSupplierId(personSupplierId)
                .personRecipientId(personRecipientId)
                .creationDate(OffsetDateTime.now().withMinute(0).withHour(0).withSecond(0).withNano(0))
                .invoiceDate(OffsetDateTime.now().withMinute(0).withHour(0).withSecond(0).withNano(0))
                .rateType("HOURLY")
                .invoiceItems(Arrays.asList(createInvoiceItemModel())).build();

    }


    public static PersonAddressFormModel createPersonAddressSupplierFormModel() {
        return PersonAddressFormModel.builder()
                .zipCode("12345")
                .street("Bonner Strasse, 177")
                .city("Bonn").build();

    }

    public static PersonAddressFormModel createPersonAddressReceiverFormModel() {
        return PersonAddressFormModel.builder()
                .zipCode("55555")
                .street("Kölner Strasse, 25")
                .city("Köln").build();

    }


    public static PersonFormModel createTestPersonFormModel() {
        PersonAddressFormModel personAddressFormModel = PersonAddressFormModel.builder()
                .city("Bonn")
                .street("Bonner Str.333")
                .zipCode("55555")
                .postBoxCode(null).build();

        BankAccountFormModel bankAccountFormModel = BankAccountFormModel.builder()
                .accountNumber("1234567890")
                .bankName("Test Bank Name")
                .bicSwift("CCCXXX")
                .iban("DE11 1234 5678 3333 4444 90").build();

        PersonFormModel personFormModel = PersonFormModel.builder()
                .personFirstName("Oleksandr")
                .personLastName("Prognimak")
                .personType(PersonType.PRIVATE.name())
                .personAddressFormModel(personAddressFormModel)
                .bankAccountFormModel(bankAccountFormModel)
                .taxNumber("" + System.currentTimeMillis())
                .email("test@test.com")
                .build();
        return personFormModel;
    }
}
