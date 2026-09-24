package com.metatwinwear.monitoring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bootstraps the monitoring service application. */
@SpringBootApplication
@EnableScheduling
public class MonitoringApplication {

    /** Starts the monitoring service.
     *
     * @param args application arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(MonitoringApplication.class, args);
    }
}
