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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

/**
 * @author Oleksandr Prognimak
 * @since 30.09.2020 - 16:33
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
        testUser.setUsername(userName);
        Person person = new Person();
        when(userService.getUserOrException(userName)).thenReturn(testUser);
        personService.savePerson(person, userName);
        assertNotNull(person.getInvoiceUser());
        assertEquals(testUser,person.getInvoiceUser());
        assertEquals(testUser.getUsername(),person.getInvoiceUser().getUsername());
    }

    @Test
    void getAllPersonAddresses() {
    }

    @Test
    void getAllBankAccounts() {
    }

    @Test
    void getAllUserPersons() {
        //GIVEN
        String userName = "TestUser";
        ArgumentCaptor<String> userNameCaptor = ArgumentCaptor.forClass(String.class);
        Person resultPerson = new Person();
        resultPerson.setPersonFirstName("TestFirstName");
        resultPerson.setPersonLastName("TestLastName");
        List<Person> result = Arrays.asList(resultPerson);
        //WHEN
        when(personRepository.findAllPersonsByUserName(userNameCaptor.capture())).thenReturn(result);
        List<Person> userPersons = personService.getAllUserPersons(userName);
        //THEN
        assertNotNull(userPersons);
        assertEquals(resultPerson.getPersonFirstName(),userPersons.get(0).getPersonFirstName());
        assertEquals(resultPerson.getPersonLastName(),userPersons.get(0).getPersonLastName());
        assertEquals(userName, userNameCaptor.getValue());

    }
}