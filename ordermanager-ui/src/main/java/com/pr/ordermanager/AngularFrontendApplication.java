package com.pr.ordermanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stringboot application for frontend
 */
@RestController
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, SecurityAutoConfiguration.class})
public class AngularFrontendApplication {
    /**
     * Start application
     *
     * @param args Arguments
     */
    public static void main(String[] args) {
        SpringApplication
                .run(AngularFrontendApplication.class,
                        args);
    }


}
