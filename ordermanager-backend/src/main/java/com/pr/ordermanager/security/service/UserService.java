/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.security.service;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.model.LoginResultResponse;
import com.pr.ordermanager.security.repository.RoleRepository;
import com.pr.ordermanager.security.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;
import static com.pr.ordermanager.exception.ErrorCode.CODE_0007;

/**
 * @author Oleksandr Prognimak
 * @since 22.09.2020 - 19:01
 */
@Service
@AllArgsConstructor
public class UserService {
    private static final Logger logger = LogManager.getLogger();

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final InvoiceUserDetailsManager invoiceUserDetailsManager;
    private final RoleRepository roleRepository;
    private final UserAuthProvider authProvider;


    public LoginResultResponse validatePasswordAndReturnToken(String loginCredential) {
        String decodedLoginHeader = new String(Base64.getDecoder().decode(loginCredential));
        String[] items = decodedLoginHeader.split(":");
        String userName = items[0];
        String password = items[1];

        InvoiceUser user = this.getInvoiceUserInternal(userName);

        if (BCrypt.checkpw(password, user.getPassword())) {
            String token = authProvider.createToken(user);
            return new LoginResultResponse(true, token);
        } else {
            return new LoginResultResponse(false, null);
        }
    }

    /**
     *
     * @param userName the user name for finding
     * @return the user which is found or exception
     */
    public InvoiceUser getUserOrException(String userName){
        return getInvoiceUserInternal(userName);
    }

    private InvoiceUser getInvoiceUserInternal(String userName) {
        try {
         //InvoiceUser user = userRepository.findByUsername(userName);
            return userRepository.findByUsername(userName);
         //return user;
        }catch (EntityNotFoundException | DataAccessException ex){
            logger.error("User is not Found",ex);
            throw new OrderManagerException(CODE_0007,"Can not find user with user name: "+ userName);
        }catch(Exception e){
            logger.error("Unexpected error",e);
            throw new OrderManagerException(CODE_0000,"Unexpected error in searching user with name: "+ userName);
        }
    }

    /**
     * Saves user name and password to th database
     * @param userName the user name
     * @param password not encoded password
     * @return encoded password
     */
    //@Transactional
    public InvoiceUser createUserLogin(String userName, String password) {
        String encriptedPassword = BCrypt.hashpw(password, BCrypt.gensalt(10));
        InvoiceUser user = new InvoiceUser(userName, encriptedPassword);
        user.setAccountNonExpired(true);
        user.setAccountNonLocked(true);
        user.setCredentialsNonExpired(true);
        user.setEnabled(true);
        user.setAuthorities(List.of(roleRepository.findByAuthority("ROLE_USER")));
        //userRepository.save(user);
        invoiceUserDetailsManager.createUser(user);
        return user;

    }
}
