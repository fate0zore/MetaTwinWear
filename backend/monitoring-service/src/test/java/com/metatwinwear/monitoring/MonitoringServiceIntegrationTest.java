package com.metatwinwear.monitoring;

import static org.junit.jupiter.api.Assertions.*;

import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.model.dto.ApiModels.ToolConfig;
import com.metatwinwear.monitoring.mapper.ConfigurationRevisionMapper;
import com.metatwinwear.monitoring.mapper.MonitoringRunMapper;
import com.metatwinwear.monitoring.mapper.TelemetrySampleMapper;
import com.metatwinwear.monitoring.service.MonitoringService;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(properties = {"eureka.client.enabled=false", "spring.task.scheduling.enabled=false"})
class MonitoringServiceIntegrationTest {
    private static final Path DATABASE = Path.of(System.getProperty("java.io.tmpdir"),
            "metatwinwear-test-" + UUID.randomUUID() + ".sqlite");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE);
    }

    @Autowired MonitoringService service;
    @Autowired ConfigurationRevisionMapper configurations;
    @Autowired MonitoringRunMapper runs;
    @Autowired TelemetrySampleMapper samples;

    @Test
    void persistsConfigurationSamplesAndOldRunsAcrossReset() {
        DashboardSnapshot initial = service.snapshot();
        assertFalse(initial.monitoring());
        assertEquals(42, initial.wearHistory().size());
        String oldRunId = initial.runId();
        ConfigurationPayload original = service.configuration();
        ToolConfig changedTool = new ToolConfig(service.options().toolModels().get(1), original.tool().type(),
                original.tool().diameter(), original.tool().length(), original.tool().toothCount(),
                original.tool().material());
        service.updateConfiguration(new ConfigurationPayload(changedTool, original.workpiece()));
        assertEquals(changedTool, service.configuration().tool());

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
        assertEquals(original, service.configuration());
        assertNotNull(runs.selectById(oldRunId));
        assertTrue(samples.recent(oldRunId, 100).size() > 42);
        assertTrue(configurations.selectCount(null) >= 3);

        service.start();
        service.initialize(); // same recovery path used at process startup
        assertFalse(service.snapshot().monitoring());
        assertEquals(reset.runId(), service.snapshot().runId());
    }
}
