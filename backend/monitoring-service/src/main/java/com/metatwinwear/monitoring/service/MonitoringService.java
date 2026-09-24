package com.metatwinwear.monitoring.service;

import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Defines the monitoring use cases exposed to controllers and scheduled jobs. */
public interface MonitoringService {

    /** Initializes persisted monitoring state and recovers an interrupted run. */
    void initialize();

    /** Returns the current monitoring snapshot.
     *
     * @return API view of the latest run
     */
    DashboardSnapshot snapshot();

    /** Returns configuration choices for the dashboard.
     *
     * @return available tool and workpiece options
     */
    ConfigurationOptions options();

    /** Starts monitoring and returns the resulting snapshot.
     *
     * @return API view of the updated run
     */
    DashboardSnapshot start();

    /** Stops monitoring and returns the resulting snapshot.
     *
     * @return API view of the updated run
     */
    DashboardSnapshot stop();

    /** Creates a new run and returns its initial snapshot.
     *
     * @return API view of the new run
     */
    DashboardSnapshot reset();

    /** Generates and persists one sample when monitoring is running. */
    void tick();

    /** Opens an event stream initialized with the current snapshot.
     *
     * @return server-sent event stream
     */
    SseEmitter subscribeEvents();
}
