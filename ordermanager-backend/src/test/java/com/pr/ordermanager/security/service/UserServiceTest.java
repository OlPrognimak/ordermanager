package com.pr.ordermanager.security.service;

import com.pr.ordermanager.TestServicesConfiguration;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.model.LoginResultResponse;
import com.pr.ordermanager.security.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

import static org.junit.Assert.*;

/**
 * @author Oleksandr Prognimak
 * @since 24.09.2020 - 09:03
 */
@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional
@Import( TestServicesConfiguration.class )
class UserServiceTest {
    @Autowired
    UserService userService;
    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void getUserOrException() {
    }

    @Test
    void createUserLogin() {
        userService.createUserLogin("test123", "test12345");
        InvoiceUser user = userService.getUserOrException("test123");
        assertNotNull(user);
        assertEquals("test123",user.getUsername());

    }

    @Test
    void validatePasswordAndReturnToken() {
        String userName = "test123";
        String password = "test12345";
        String credentials = Base64.getEncoder().encodeToString((userName + ":" + password).getBytes());

        userService.createUserLogin(userName, password);

        LoginResultResponse resultResponse = userService.validatePasswordAndReturnToken(credentials);
        assertTrue(resultResponse.isLogged());
        assertNotNull(resultResponse.getToken());
    }
}