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
package com.pr.ordermanager.security.controller;

import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.security.model.LoginResultResponse;
import com.pr.ordermanager.security.service.UserService;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * @author Oleksandr Prognimak
 * @since 21.09.2020 - 22:24
 */
@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class InvoiceUserController {
 public final static Logger logger = LogManager.getLogger(InvoiceUserController.class);

    private final UserService userService;


    @PostMapping(value = "/registration")
    public ResponseEntity<CreatedResponse> createUser(@RequestHeader(name = "User-Name") String userName,
                                             @RequestHeader(name = "User-Password") String userPassword){
        Long userLogin = userService.createUserLogin(userName, userPassword).getId();
        CreatedResponse createdResponse = new CreatedResponse(userLogin);
        return ResponseEntity.ok(createdResponse);
    }

    @PostMapping(value = "/perform_logout")
    public ResponseEntity<String> logout() {
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/login")
    public ResponseEntity<LoginResultResponse> login(
            @RequestHeader(name = "Login-Credentials") String loginCredential) {
        return ResponseEntity.ok(userService.validatePasswordAndReturnToken(loginCredential));
    }

    @GetMapping(value = "/checkUser")
    public ResponseEntity<String> user(Principal user) {
        String result="";
        if(user!=null) {
            result = "{\"logged\": true}";
        }else{
            result = "{\"logged\": false}";
        }
        return ResponseEntity.ok(result);
    }

}
