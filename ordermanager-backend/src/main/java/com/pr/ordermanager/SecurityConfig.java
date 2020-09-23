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
package com.pr.ordermanager;

import com.pr.ordermanager.security.service.InvoiceSecurityUserDetailsService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * @author Oleksandr Prognimak
 * @since 21.09.2020 - 22:24
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    private static final Logger logger = LogManager.getLogger(SecurityConfig.class);
//    @Autowired
//    PasswordEncoder passwordEncoder;
    @Autowired
    private InvoiceSecurityUserDetailsService invoiceSecurityUserDetailsService;

    @Override
    protected void configure(HttpSecurity http) throws Exception
    {
        logger.info("LogConfiguration started");
        http.authorizeRequests().regexMatchers("\\/login*").permitAll()
                .anyRequest().authenticated().and().httpBasic();

//                .and().formLogin().loginPage("/login").permitAll() //redirect to login page
//                .and().logout().permitAll();

//                http.csrf().disable()
//                .authorizeRequests()
//                .regexMatchers("\\/person*","\\/invoice*")
//                //.anyRequest()
//                .authenticated()
//                .and()
//                .httpBasic();
    }

    @Autowired
    public void configureGlobal(AuthenticationManagerBuilder auth)
            throws Exception
    {
        logger.info("LogConfiguration started");
        auth.userDetailsService(invoiceSecurityUserDetailsService);
//        Authentication contextAuth = SecurityContextHolder.getContext().getAuthentication();
//        String userName = contextAuth.getName();
//        logger.info("User name :"+userName);
//        Object credentials =
//               contextAuth.getCredentials();
//        logger.info("Credentials :"+credentials);



//        userService.getUserOrException(userName);
//       auth.getDefaultUserDetailsService()
//        auth.
//                .inMemoryAuthentication()
//                .withUser("admin")
//                .password("{noop}password")
//                .roles("USER");
    }
//
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

//    @Bean
//    public PasswordEncoder passwordEncoder() {
//        return new DelegatingPasswordEncoder();
//    }


//    @Bean
//    public AuthenticationProvider daoAuthenticationProvider() {
//        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
//        provider.setPasswordEncoder(passwordEncoder);
//        provider.setUserDetailsPasswordService(
//                this.databaseUserDetailPasswordService);
//        provider.setUserDetailsService(this.databaseUserDetailsService);
//        return provider;
//    }
}
