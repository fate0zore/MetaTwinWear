package com.metatwinwear.monitoring.scheduler;

import com.metatwinwear.monitoring.service.MonitoringService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Triggers periodic monitoring sample generation. */
@Component
public class MonitoringScheduler {
    private final MonitoringService monitoring;

    /** Creates the scheduler with the monitoring service contract.
     *
     * @param monitoring monitoring service contract
     */
    public MonitoringScheduler(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    /** Generates the next sample once per second when monitoring is active. */
    @Scheduled(fixedDelay = 1000)
    public void sample() {
        monitoring.tick();
    }
}
