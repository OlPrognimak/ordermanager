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
