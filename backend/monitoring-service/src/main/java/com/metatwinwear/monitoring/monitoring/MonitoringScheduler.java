package com.metatwinwear.monitoring.monitoring;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MonitoringScheduler {
    private final MonitoringService monitoring;

    public MonitoringScheduler(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    @Scheduled(fixedDelay = 1000)
    public void sample() {
        monitoring.tick();
    }
}
