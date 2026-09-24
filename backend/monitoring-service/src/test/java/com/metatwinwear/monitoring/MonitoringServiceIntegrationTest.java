package com.metatwinwear.monitoring;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.mapper.MonitoringRunMapper;
import com.metatwinwear.monitoring.mapper.ToolCatalogMapper;
import com.metatwinwear.monitoring.mapper.TelemetrySampleMapper;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import com.metatwinwear.monitoring.model.entity.ToolCatalogRecord;
import com.metatwinwear.monitoring.service.MonitoringService;
import com.metatwinwear.monitoring.service.SseHub;
import com.metatwinwear.monitoring.service.ToolCatalogService;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"eureka.client.enabled=false", "spring.task.scheduling.enabled=false"})
@AutoConfigureMockMvc
@Import(MonitoringServiceIntegrationTest.InternalErrorTestConfiguration.class)
class MonitoringServiceIntegrationTest {
    private static final Path DATABASE = Path.of(System.getProperty("java.io.tmpdir"),
            "metatwinwear-test-" + UUID.randomUUID() + ".sqlite");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE);
    }

    @Autowired MonitoringService service;
    @Autowired ToolCatalogService toolCatalog;
    @Autowired MonitoringRunMapper runs;
    @Autowired TelemetrySampleMapper samples;
    @Autowired ToolCatalogMapper tools;
    @Autowired SseHub events;
    @Autowired MockMvc mockMvc;

    @Test
    void importsCatalogueRecordsAndServesTheirImages() throws Exception {
        List<ToolCatalogRecord> catalogue = tools.selectCatalogue();
        assertEquals(13, catalogue.size());
        assertEquals(13, toolCatalog.list().size());
        ToolCatalogRecord twelveMillimetreTool = tools.selectById(ToolCatalogService.DEFAULT_TOOL_MODEL);
        assertNotNull(twelveMillimetreTool);
        assertEquals(12, twelveMillimetreTool.diameter);
        assertEquals(103, twelveMillimetreTool.length);
        assertEquals(4, twelveMillimetreTool.toothCount);

        mockMvc.perform(get("/api/v1/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(13)))
                .andExpect(jsonPath("$.data[3].model").value(ToolCatalogService.DEFAULT_TOOL_MODEL))
                .andExpect(jsonPath("$.data[3].imageUrl").exists());

        for (ToolCatalogRecord tool : catalogue) {
            String encodedModel = UriUtils.encodePathSegment(tool.model, StandardCharsets.UTF_8);
            mockMvc.perform(get(URI.create("/api/v1/tools/" + encodedModel + "/image")))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.IMAGE_JPEG))
                    .andExpect(result -> assertTrue(result.getResponse().getContentAsByteArray().length > 0));
        }

        mockMvc.perform(get("/api/v1/tools/unknown/image"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void wrapsJsonEndpointsAndSseSnapshotPayload() throws Exception {
        mockMvc.perform(get("/api/v1/configuration"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/configuration/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.toolModels", hasSize(13)));
        mockMvc.perform(get("/api/v1/monitoring/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.runId").exists())
                .andExpect(jsonPath("$.data.tool.model").value(ToolCatalogService.DEFAULT_TOOL_MODEL));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/monitoring/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.monitoring").value(true));
        mockMvc.perform(post("/api/v1/monitoring/stop"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.monitoring").value(false));
        mockMvc.perform(post("/api/v1/monitoring/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.monitoring").value(false));

        MvcResult pending = mockMvc.perform(get("/api/v1/monitoring/events")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(request().asyncStarted())
                .andReturn();
        events.heartbeat();
        String eventBody = pending.getResponse().getContentAsString();
        assertTrue(eventBody.contains("event:snapshot"));
        assertTrue(eventBody.contains("event:heartbeat"));
        assertTrue(eventBody.contains("\"code\":200"));
        assertTrue(eventBody.contains("\"data\":\"ok\""));
        assertTrue(eventBody.contains("\"runId\""));
    }

    @Test
    void recalculatesLegacyWearStageInSnapshotResponse() throws Exception {
        DashboardSnapshot reset = service.reset();
        TelemetrySample legacySample = samples.recent(reset.runId(), 1).get(0);
        legacySample.wearValue = 0.23;
        legacySample.stage = "稳定磨损";
        legacySample.status = "warning";
        samples.updateById(legacySample);

        mockMvc.perform(get("/api/v1/monitoring/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.wear.currentWear").value(0.23))
                .andExpect(jsonPath("$.data.wear.stage").value("加速磨损"))
                .andExpect(jsonPath("$.data.wear.status").value("warning"))
                .andExpect(jsonPath("$.data.recommendations[0].tone").value("stage-accelerated"))
                .andExpect(jsonPath("$.data.recommendations[1].value").value("较高"));
    }

    @Test
    void returnsConsistentEnvelopesForValidationRoutingAndUnexpectedErrors() throws Exception {
        mockMvc.perform(post("/api/v1/configuration/options"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value(405));
        mockMvc.perform(get("/api/v1/no-such-endpoint"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
        mockMvc.perform(get("/api/v1/test/internal-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value("服务器内部错误"))
                .andExpect(content().string(not(containsString("sensitive internal detail"))));
    }

    @Test
    void keepsSamplesAndOldRunsAcrossReset() {
        DashboardSnapshot initial = service.snapshot();
        assertFalse(initial.monitoring());
        assertEquals(42, initial.wearHistory().size());
        assertEquals(ToolCatalogService.DEFAULT_TOOL_MODEL, initial.tool().model());
        String oldRunId = initial.runId();

        assertTrue(service.start().monitoring());
        assertTrue(service.start().monitoring());
        service.tick();
        DashboardSnapshot stopped = service.stop();
        assertFalse(stopped.monitoring());
        assertFalse(service.stop().monitoring());
        assertTrue(stopped.sequence() > initial.sequence());

        DashboardSnapshot reset = service.reset();
        assertNotEquals(oldRunId, reset.runId());
        assertFalse(reset.monitoring());
        assertEquals(42, reset.wearHistory().size());
        assertEquals(ToolCatalogService.DEFAULT_TOOL_MODEL, reset.tool().model());
        assertNotNull(runs.selectById(oldRunId));
        assertTrue(samples.recent(oldRunId, 100).size() > 42);

        service.start();
        service.initialize(); // same recovery path used at process startup
        assertFalse(service.snapshot().monitoring());
        assertEquals(reset.runId(), service.snapshot().runId());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class InternalErrorTestConfiguration {
        @Bean
        InternalErrorTestController internalErrorTestController() {
            return new InternalErrorTestController();
        }
    }

    @RestController
    static class InternalErrorTestController {
        @GetMapping("/api/v1/test/internal-error")
        String fail() {
            throw new IllegalStateException("sensitive internal detail");
        }
    }
}
