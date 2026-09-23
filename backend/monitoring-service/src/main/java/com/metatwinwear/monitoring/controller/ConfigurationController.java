package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.service.MonitoringService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuration")
public class ConfigurationController {
    private final MonitoringService monitoring;

    public ConfigurationController(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    @GetMapping
    /** Returns the active tool and workpiece configuration. */
    public ApiResponse<ConfigurationPayload> configuration() {
        return ApiResponse.success(monitoring.configuration());
    }

    @PutMapping
    /** Validates and persists a complete tool and workpiece configuration. */
    public ApiResponse<ConfigurationPayload> update(@Valid @RequestBody ConfigurationPayload configuration) {
        return ApiResponse.success("配置已保存", monitoring.updateConfiguration(configuration));
    }

    @GetMapping("/options")
    /** Returns the distinct options used by the configuration form. */
    public ApiResponse<ConfigurationOptions> options() {
        return ApiResponse.success(monitoring.options());
    }
}
