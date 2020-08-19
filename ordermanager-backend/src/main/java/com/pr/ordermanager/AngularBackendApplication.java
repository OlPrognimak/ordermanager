package com.pr.ordermanager;

import javax.servlet.Filter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableJpaRepositories(basePackages = {"com.pr.ordermanager.repository.jpa"})
public class AngularBackendApplication {


    /**
     *
     * @param args parameters
     */
    public static void main(String[] args) {
        SpringApplication
                .run(AngularBackendApplication.class,
                        args);
    }


    @Bean(name = "corsFilter")
    public Filter corsFilter() {
        return new CorsFilter();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }



    @Bean
    public FilterRegistrationBean corsFilterRegistration() {
        FilterRegistrationBean registration = new FilterRegistrationBean();
        registration.setFilter(corsFilter());
        registration.addUrlPatterns("/*");
        registration.setName("corsFilter");
        registration.setOrder(1);
        return registration;
    }
}
