package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.service.MonitoringService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Exposes monitoring snapshots, state transitions, and server-sent events. */
@RestController
@RequestMapping("/api/v1/monitoring")
public class MonitoringController {
    private final MonitoringService monitoring;

    /** Creates the controller with its monitoring use-case service.
     *
     * @param monitoring monitoring use-case service
     */
    public MonitoringController(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    /** Returns the current monitoring snapshot.
     *
     * @return wrapped dashboard snapshot
     */
    @GetMapping("/snapshot")
    public ApiResponse<DashboardSnapshot> snapshot() {
        return ApiResponse.success(monitoring.snapshot());
    }

    /** Opens a stream of wrapped snapshots and heartbeat events.
     *
     * @return server-sent event stream
     */
    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        return monitoring.subscribeEvents();
    }

    /** Starts monitoring and returns the resulting snapshot.
     *
     * @return wrapped dashboard snapshot
     */
    @PostMapping("/start")
    public ApiResponse<DashboardSnapshot> start() {
        return ApiResponse.success("监控已启动", monitoring.start());
    }

    /** Stops monitoring and returns the resulting snapshot.
     *
     * @return wrapped dashboard snapshot
     */
    @PostMapping("/stop")
    public ApiResponse<DashboardSnapshot> stop() {
        return ApiResponse.success("监控已停止", monitoring.stop());
    }

    /** Resets monitoring data and returns the new snapshot.
     *
     * @return wrapped dashboard snapshot
     */
    @PostMapping("/reset")
    public ApiResponse<DashboardSnapshot> reset() {
        return ApiResponse.success("监控数据已重置", monitoring.reset());
    }
}
