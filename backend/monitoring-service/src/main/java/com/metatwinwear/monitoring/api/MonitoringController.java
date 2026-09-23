package com.metatwinwear.monitoring.api;

import com.metatwinwear.monitoring.api.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.monitoring.MonitoringService;
import com.metatwinwear.monitoring.monitoring.SseHub;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/monitoring")
public class MonitoringController {
    private final MonitoringService monitoring;
    private final SseHub events;

    public MonitoringController(MonitoringService monitoring, SseHub events) {
        this.monitoring = monitoring;
        this.events = events;
    }

    @GetMapping("/snapshot")
    public DashboardSnapshot snapshot() {
        return monitoring.snapshot();
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        return events.subscribe(monitoring.snapshot());
    }

    @PostMapping("/start")
    public DashboardSnapshot start() {
        return monitoring.start();
    }

    @PostMapping("/stop")
    public DashboardSnapshot stop() {
        return monitoring.stop();
    }

    @PostMapping("/reset")
    public DashboardSnapshot reset() {
        return monitoring.reset();
    }
}
