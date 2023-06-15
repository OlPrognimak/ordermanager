package com.pr.ordermanager.security.repository;

import com.pr.ordermanager.security.entity.InvoiceUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @created 30.09.2020 - 22:31
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@TestPropertySource(locations = "classpath:testapplication.properties")
class UserRepositoryTest {
    @Autowired
    UserRepository userRepository;

    @Test
    void saveUser() {
        String password="test123";
        String userName="user1";
        String encriptedPassword = BCrypt.hashpw(password, BCrypt.gensalt(10));
        InvoiceUser existedUser = userRepository.findByUsername(userName);
        InvoiceUser user = new InvoiceUser(userName, encriptedPassword);
        userRepository.save(user);
    }
}