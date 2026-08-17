package com.pr.ordermanager;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.ManagementWebSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Stringboot application for frontend‚
 */
@RestController
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        SecurityAutoConfiguration.class,
        UserDetailsServiceAutoConfiguration.class,
        ManagementWebSecurityAutoConfiguration.class
})
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

    /**
     * Provides url for backend service.
     * @return url wrapper
     */
    @GetMapping(value = "/backendUrl")
    public UrlTransfer getBaseUrl(){
        return UrlTransfer.builder().url(backendBaseUrl).build();
    }
}
