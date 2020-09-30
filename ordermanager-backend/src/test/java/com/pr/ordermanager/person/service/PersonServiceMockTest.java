package com.pr.ordermanager.person.service;

import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.repository.BankAccountRepository;
import com.pr.ordermanager.person.repository.PersonAddressRepository;
import com.pr.ordermanager.person.repository.PersonRepository;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.platform.runner.JUnitPlatform;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

/**
 * @author Oleksandr Prognimak
 * @created 30.09.2020 - 16:33
 */
@ExtendWith(MockitoExtension.class)
@RunWith(JUnitPlatform.class)
class PersonServiceMockTest {

    @Mock
    PersonRepository personRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    PersonAddressRepository personAddressRepository;
    @Mock
    BankAccountRepository bankAccountRepository;
    @Mock
    UserService userService;

    @InjectMocks
    PersonService personService;

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }

    @Test
    void savePerson() {
        String userName = "TestUser";
        InvoiceUser testUser = new InvoiceUser();
        testUser.setUserName(userName);
        Person person = new Person();
        when(userService.getUserOrException(userName)).thenReturn(testUser);


        personService.savePerson(person, userName);
        assertNotNull(person.getInvoiceUser());
        assertEquals(testUser,person.getInvoiceUser());
        assertEquals(testUser.getUserName(),person.getInvoiceUser().getUserName());
    }

    @Test
    void getAllPersonAddresses() {
    }

    @Test
    void getAllBankAccounts() {
    }

    @Test
    void getAllUserPersons() {
    }
}