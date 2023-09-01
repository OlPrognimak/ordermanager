package com.pr.ordermanager;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stringboot application for frontend
 */
@RestController
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, SecurityAutoConfiguration.class})
public class AngularFrontendApplication {
    @Value("${app.backend.url}")
    private String backendBaseUrl;
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

    @GetMapping(value = "/backendUrl")
    public UrlTransfer getBaseUrl(){
        return UrlTransfer.builder().url(backendBaseUrl).build();
    }
}
