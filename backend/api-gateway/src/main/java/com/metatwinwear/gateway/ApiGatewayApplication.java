package com.metatwinwear.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Bootstraps the API gateway application. */
@SpringBootApplication
public class ApiGatewayApplication {

    /** Starts the API gateway.
     *
     * @param args application arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
