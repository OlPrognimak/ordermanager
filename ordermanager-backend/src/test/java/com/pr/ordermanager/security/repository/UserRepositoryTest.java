package com.pr.ordermanager.security.repository;

import com.pr.ordermanager.security.entity.InvoiceUser;
import org.hibernate.PropertyValueException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * @author Oleksandr Prognimak
 * @created 30.09.2020 - 22:31
 */
@ExtendWith(SpringExtension.class)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {
    @Autowired
    UserRepository userRepository;

    @Transactional
    @BeforeEach
    public void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void saveUser() {
        String password="test123";
        String userName="user1";
        String encriptedPassword = BCrypt.hashpw(password, BCrypt.gensalt(10));
        InvoiceUser user = new InvoiceUser(userName, encriptedPassword);
        userRepository.save(user);
    }

    @Test
    void notNullUserName() {
        InvoiceUser testUser =  InvoiceUser.builder()
                .accountNonExpired(true)
                .accountNonLocked(true)
                .username(null)
                .password("123").build();
        DataIntegrityViolationException exception =
                assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(testUser));
        assertEquals("username", ((PropertyValueException)exception.getCause()).getPropertyName() );
    }

    @Transactional
    @Test
    void notNullPassword() {
        InvoiceUser testUser =  InvoiceUser.builder()
                .accountNonExpired(true)
                .accountNonLocked(true)
                .username("testuser")
                .password(null).build();
        DataIntegrityViolationException exception =
                assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(testUser));
        assertEquals("password", ((PropertyValueException)exception.getCause()).getPropertyName() );
    }

    @Transactional
    @Test
    @Disabled ("Strange but with H2 Unique Constraint does not work work")
    void uniqueUserName() {
        InvoiceUser testUser =  InvoiceUser.builder()
                .accountNonExpired(true)
                .accountNonLocked(true)
                .username("testuser")
                .password("12345").build();
        userRepository.save(testUser);

        DataIntegrityViolationException exception =
                assertThrows(DataIntegrityViolationException.class, () -> userRepository.save(testUser));
        assertEquals("password", ((PropertyValueException)exception.getCause()).getPropertyName() );
    }
}