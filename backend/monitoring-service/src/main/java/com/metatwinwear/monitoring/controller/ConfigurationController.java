package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.service.MonitoringService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes the configuration choices used by the dashboard. */
@RestController
@RequestMapping("/api/v1/configuration")
public class ConfigurationController {
    private final MonitoringService monitoring;

    /** Creates the controller with its monitoring use-case service.
     *
     * @param monitoring monitoring use-case service
     */
    public ConfigurationController(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    /** Returns the distinct options used by the configuration form.
     *
     * @return wrapped configuration options
     */
    @GetMapping("/options")
    public ApiResponse<ConfigurationOptions> options() {
        return ApiResponse.success(monitoring.options());
    }
}
