package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.service.MonitoringService;
import com.metatwinwear.monitoring.service.SseHub;
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
    /** Returns the current monitoring snapshot. */
    public ApiResponse<DashboardSnapshot> snapshot() {
        return ApiResponse.success(monitoring.snapshot());
    }

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    /** Opens a stream of wrapped snapshots and heartbeat events. */
    public SseEmitter events() {
        return events.subscribe(monitoring.snapshot());
    }

    @PostMapping("/start")
    /** Starts monitoring and returns the resulting snapshot. */
    public ApiResponse<DashboardSnapshot> start() {
        return ApiResponse.success("监控已启动", monitoring.start());
    }

    @PostMapping("/stop")
    /** Stops monitoring and returns the resulting snapshot. */
    public ApiResponse<DashboardSnapshot> stop() {
        return ApiResponse.success("监控已停止", monitoring.stop());
    }

    @PostMapping("/reset")
    /** Resets monitoring state and returns the new snapshot. */
    public ApiResponse<DashboardSnapshot> reset() {
        return ApiResponse.success("监控数据已重置", monitoring.reset());
    }
}
