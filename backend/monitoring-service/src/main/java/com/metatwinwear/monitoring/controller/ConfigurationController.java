package com.metatwinwear.monitoring.controller;

import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.service.MonitoringService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
    public ConfigurationPayload configuration() {
        return monitoring.configuration();
    }

    @PutMapping
    public ConfigurationPayload update(@Valid @RequestBody ConfigurationPayload configuration) {
        return monitoring.updateConfiguration(configuration);
    }

    @GetMapping("/options")
    public ConfigurationOptions options() {
        return monitoring.options();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail invalidConfiguration(IllegalArgumentException error) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detail.setDetail(error.getMessage());
        return detail;
    }
}
