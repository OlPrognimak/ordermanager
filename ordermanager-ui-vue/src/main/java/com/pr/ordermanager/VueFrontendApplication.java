package com.pr.ordermanager;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.actuate.autoconfigure.security.servlet.ManagementWebSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Springboot application runner for Vue frontend.
 */
@RestController
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, SecurityAutoConfiguration.class,
        ManagementWebSecurityAutoConfiguration.class})
public class VueFrontendApplication {
    @Value("${app.backend.url}")
    private String backendBaseUrl;

    public static void main(String[] args) {
        SpringApplication.run(VueFrontendApplication.class, args);
    }

    @GetMapping(value = "/backendUrl")
    public UrlTransfer getBaseUrl() {
        return UrlTransfer.builder().url(backendBaseUrl).build();
    }
}
