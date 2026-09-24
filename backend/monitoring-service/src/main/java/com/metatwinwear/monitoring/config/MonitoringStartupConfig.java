package com.metatwinwear.monitoring.config;

import com.metatwinwear.monitoring.service.MonitoringService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Runs monitoring recovery after the application context starts. */
@Configuration
public class MonitoringStartupConfig {

    /** Initializes the current monitoring run before requests are served.
     *
     * @param monitoring monitoring service contract
     * @return application startup callback
     */
    @Bean
    public ApplicationRunner initializeMonitoring(MonitoringService monitoring) {
        return args -> monitoring.initialize();
    }
}
