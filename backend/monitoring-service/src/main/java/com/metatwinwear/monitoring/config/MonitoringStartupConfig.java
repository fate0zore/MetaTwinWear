package com.metatwinwear.monitoring.config;

import com.metatwinwear.monitoring.service.MonitoringService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MonitoringStartupConfig {
    @Bean
    ApplicationRunner initializeMonitoring(MonitoringService monitoring) {
        return args -> monitoring.initialize();
    }
}
