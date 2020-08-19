package com.pr.ordermanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.web.bind.annotation.RestController;

@RestController
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class AngularFrontendApplication {
    /**
     * @param args Arguments
     */
    public static void main(String[] args) {
        SpringApplication
                .run(AngularFrontendApplication.class,
                        args);
    }


}
