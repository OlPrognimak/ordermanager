package com.pr.ordermanager.security.service;

import com.pr.ordermanager.TestServicesConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * @author Oleksandr Prognimak
 * @sence 24.09.2020 - 09:03
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@Transactional
@Import( TestServicesConfiguration.class )
class UserServiceTest {
    @Autowired
    UserService userService;

    @Test
    void getUserOrException() {
    }

    @Test
    void createUserLogin() {
        userService.createUserLogin("admin", "test12345");
    }
}