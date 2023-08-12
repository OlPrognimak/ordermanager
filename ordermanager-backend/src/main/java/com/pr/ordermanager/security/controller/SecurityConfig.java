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

import com.pr.ordermanager.security.service.InvoiceUserDetailsManager;
import org.aopalliance.intercept.MethodInvocation;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.aop.Advisor;
import org.springframework.aop.support.JdkRegexpMethodPointcut;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.authorization.method.SecuredAuthorizationManager;
import org.springframework.security.config.annotation.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.lang.reflect.Field;
import java.util.Arrays;

/**
 * @author Oleksandr Prognimak
 * @since 21.09.2020 - 22:24
 */
@Configuration
@EnableWebSecurity
//@EnableMethodSecurity
@Order(SecurityProperties.BASIC_AUTH_ORDER - 10)
public class SecurityConfig {
    private static final Logger logger = LogManager.getLogger(SecurityConfig.class);

    private static final boolean debugSecurity = false;


    @Bean
    public AuthenticationManager authenticationManager(InvoiceUserDetailsManager invoiceUserDetailsManager,
            HttpSecurity httpSecurity, BCryptPasswordEncoder bCryptPasswordEncoder) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder =
                httpSecurity.getSharedObject(AuthenticationManagerBuilder.class);
        authenticationManagerBuilder
               .userDetailsService(invoiceUserDetailsManager)
                .passwordEncoder(bCryptPasswordEncoder);
        AuthenticationManager auth = authenticationManagerBuilder.build();
        return auth;
    }


    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider(InvoiceUserDetailsManager invoiceUserDetailsManager,
                                                           BCryptPasswordEncoder bCryptPasswordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(invoiceUserDetailsManager);
        authProvider.setPasswordEncoder(bCryptPasswordEncoder);

        return authProvider;
    }



    @Bean
    public AuthorizationManager<MethodInvocation> authorizationManager() {
        return new SecuredAuthorizationManager();
    }

  //  @Bean
  //  @Role(ROLE_INFRASTRUCTURE)
    public Advisor authorizationManagerBeforeMethodInterception(AuthorizationManager<MethodInvocation> authorizationManager) {
        JdkRegexpMethodPointcut pattern = new JdkRegexpMethodPointcut();
        pattern.setPatterns("com.pr.ordermanager.security.service.*",
                "com.pr.ordermanager.invoice.service.*",
                "com.pr.ordermanager.person.service.*");
        return new AuthorizationManagerBeforeMethodInterceptor(pattern, authorizationManager);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/*").allowedOrigins("*");
            }
        };
    }


    @Bean
    public FilterRegistrationBean filterRegistrationBean() {
        UrlBasedCorsConfigurationSource corsConfigurationSource = new UrlBasedCorsConfigurationSource();
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.addAllowedOriginPattern("*");
        corsConfiguration.setAllowedHeaders(Arrays.asList(
                HttpHeaders.AUTHORIZATION,
                HttpHeaders.CONTENT_DISPOSITION,
                HttpHeaders.ACCEPT,
                HttpHeaders.CONTENT_TYPE,
                HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
                HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS
        ));

        corsConfiguration.setAllowedMethods(Arrays.asList(
                HttpMethod.GET.name(),
                HttpMethod.PUT.name(),
                HttpMethod.OPTIONS.name(),
                HttpMethod.POST.name(),
                HttpMethod.HEAD.name(),
                HttpMethod.DELETE.name()
        ));
        corsConfiguration.setMaxAge(60*60L);
        corsConfigurationSource.registerCorsConfiguration("/**",corsConfiguration);
        FilterRegistrationBean filterRegistrationBean = new FilterRegistrationBean(new CorsFilter(corsConfigurationSource));
        filterRegistrationBean.setOrder(-102);
        return filterRegistrationBean;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

       return http.httpBasic(httBasic -> httBasic.addObjectPostProcessor(
                       new ObjectPostProcessor<BasicAuthenticationFilter>() {
                           @Override
                           public <O extends BasicAuthenticationFilter> O postProcess(O filter) {
                               filter.setSecurityContextRepository(new HttpSessionSecurityContextRepository());
                               return filter;
                           }
                       }
               ))
               .csrf(csrf -> csrf.disable()).cors((cors->cors.disable()))
               .sessionManagement(sessionMng -> {
                           sessionMng.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
                           sessionMng.sessionFixation().newSession();
                       }
               )
               .authorizeHttpRequests( (authorize) -> authorize
                        .requestMatchers("/registration", "/login", "/error", "/user").anonymous()
                        .requestMatchers("/css/**", "/js/**", "/img/**", "/lib/**", "/favicon.ico",
                                "/polyfills.js")
                        .anonymous()
                       .requestMatchers(HttpMethod.OPTIONS,"/person/**",
                               "/invoice/**", "/person",
                               "/invoice", "/logout", "/persons", "/checkUser").permitAll()
                       .requestMatchers(HttpMethod.GET, "/person/**",
                                "/invoice/**", "/persons", "/checkUser").authenticated()
                       .requestMatchers(HttpMethod.PUT, "/person/**",
                             "/invoice/**").authenticated()
                       .requestMatchers(HttpMethod.POST,
                               "/invoice/**", "/person/**").authenticated()
                       .requestMatchers(HttpMethod.DELETE,
                               "/invoice/**", "/person/**", "/person", "/invoice").authenticated()

                )
               //.httpBasic(Customizer.withDefaults())
               .build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.debug(debugSecurity)
                .ignoring()
                .requestMatchers("/registration", "/login", "/invoice/report");

                //.requestMatchers("/css/**", "/js/**", "/img/**", "/lib/**", "/favicon.ico");
                //.antMatchers("/css/**", "/js/**", "/img/**", "/lib/**", "/favicon.ico");
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public UsernamePasswordAuthenticationFilter
            usernamePasswordAuthenticationFilter(AuthenticationManager authenticationManager,
                                                 AuthenticationSuccessHandler authenticationSuccessHandler) {
        InvoiceUsernamePasswordAuthenticationFilter filter =
                new InvoiceUsernamePasswordAuthenticationFilter(authenticationManager);
        try {
            Class abstractSuccessHandler = filter.getClass().getSuperclass().getSuperclass();
            Field successHandlerField = abstractSuccessHandler.getDeclaredField("successHandler");
            successHandlerField.setAccessible(true);
            successHandlerField.set(filter, authenticationSuccessHandler);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return filter;
    }

    @Bean
    public InvoiceRedirectUrl invoiceRedirectUrl() {
        return new InvoiceRedirectUrl("/frontend");
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler(InvoiceRedirectUrl invoiceRedirectUrl) {
        return new InvoiceAuthenticationSuccessHandler("/user", invoiceRedirectUrl);
    }

}
