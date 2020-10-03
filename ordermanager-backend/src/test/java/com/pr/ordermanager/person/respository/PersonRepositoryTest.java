package com.pr.ordermanager.person.respository;

import com.pr.ordermanager.RepositoryTestHelper;
import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.person.entity.BankAccount;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.person.entity.PersonAddress;
import com.pr.ordermanager.person.entity.PersonType;
import com.pr.ordermanager.person.repository.PersonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
@Import( TestServicesConfiguration.class )
@Transactional
class PersonRepositoryTest {
    @Autowired
    PersonRepository personRepository;


    @BeforeEach
    void setUp() {
        personRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        personRepository.deleteAll();
    }

    @Test
    public void testGetAll() throws Exception {
        PersonAddress personRecipientAddress =
                RepositoryTestHelper.createPersonAddress(
                        "Köln", "Kölner str.", null,"55555");

        BankAccount bankRecipientAccount =
                RepositoryTestHelper.createBankAccount(
                        "DE44 5555 5555 5555 5555 5", "Receiver  Bank");
        Person person =
                RepositoryTestHelper.createPerson (
                        PersonType.PRIVATE, personRecipientAddress, bankRecipientAccount );
        personRepository.save(person);
        List<Person> personList = personRepository.findAll();
        Assertions.assertEquals(1, personList.size());
        assertThat(person, is(personList.get(0)));
    }

}