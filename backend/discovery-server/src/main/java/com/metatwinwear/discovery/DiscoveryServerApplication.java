package com.metatwinwear.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/** Bootstraps the Eureka discovery server. */
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {

    /** Starts the Eureka discovery server.
     *
     * @param args application arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
