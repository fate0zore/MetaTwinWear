package com.metatwinwear.monitoring.service;

import com.metatwinwear.monitoring.model.dto.ApiModels.*;
import com.metatwinwear.monitoring.mapper.*;
import com.metatwinwear.monitoring.model.entity.*;
import com.metatwinwear.monitoring.simulation.SampleGenerator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MonitoringService {
    private final Object lock = new Object();
    private final ConfigurationRevisionMapper configurations;
    private final MonitoringRunMapper runs;
    private final TelemetrySampleMapper samples;
    private final ToolCatalogService catalog;
    private final SampleGenerator generator;
    private final DashboardAssembler assembler;
    private final SseHub events;
    private final TransactionTemplate transactions;
    private volatile boolean ready;

    public MonitoringService(ConfigurationRevisionMapper configurations, MonitoringRunMapper runs,
                             TelemetrySampleMapper samples, ToolCatalogService catalog, SampleGenerator generator,
                             DashboardAssembler assembler, SseHub events, TransactionTemplate transactions) {
        this.configurations = configurations;
        this.runs = runs;
        this.samples = samples;
        this.catalog = catalog;
        this.generator = generator;
        this.assembler = assembler;
        this.events = events;
        this.transactions = transactions;
    }

    public void initialize() {
        synchronized (lock) {
            transactions.executeWithoutResult(status -> {
                ConfigurationRevision config = configurations.latest();
                if (config == null) config = insertConfiguration(catalog.defaults(), 1);
                else if (!catalog.options().toolModels().contains(config.model)) {
                    config = insertConfiguration(catalog.defaults(), config.version + 1);
                }
                MonitoringRun run = runs.latest();
                if (run == null) {
                    insertSeededRun(config);
                } else if ("RUNNING".equals(run.status)) {
                    run.status = "STOPPED";
                    run.stoppedAtMs = System.currentTimeMillis();
                    runs.updateById(run);
                }
            });
            ready = true;
        }
    }

    public DashboardSnapshot snapshot() {
        synchronized (lock) {
            return current();
        }
    }

    public ConfigurationPayload configuration() {
        synchronized (lock) {
            ConfigurationRevision config = configurations.latest();
            return new ConfigurationPayload(
                    new ToolConfig(config.model, config.type, config.diameter, config.length, config.toothCount,
                            config.material),
                    new WorkpieceConfig(config.workpieceSize, config.workpieceMaterial));
        }
    }

    public ConfigurationOptions options() {
        return catalog.options();
    }

    public ConfigurationPayload updateConfiguration(ConfigurationPayload payload) {
        catalog.validate(payload);
        DashboardSnapshot snapshot;
        synchronized (lock) {
            transactions.executeWithoutResult(status -> {
                ConfigurationRevision latest = configurations.latest();
                insertConfiguration(payload, latest.version + 1);
            });
            snapshot = current();
        }
        events.publish(snapshot);
        return payload;
    }

    public DashboardSnapshot start() {
        return changeState(true);
    }

    public DashboardSnapshot stop() {
        return changeState(false);
    }

    private DashboardSnapshot changeState(boolean running) {
        DashboardSnapshot snapshot;
        synchronized (lock) {
            transactions.executeWithoutResult(status -> {
                MonitoringRun run = runs.latest();
                String next = running ? "RUNNING" : "STOPPED";
                if (!next.equals(run.status)) {
                    run.status = next;
                    run.stoppedAtMs = running ? null : System.currentTimeMillis();
                    runs.updateById(run);
                }
            });
            snapshot = current();
        }
        events.publish(snapshot);
        return snapshot;
    }

    public DashboardSnapshot reset() {
        DashboardSnapshot snapshot;
        synchronized (lock) {
            transactions.executeWithoutResult(status -> {
                MonitoringRun previous = runs.latest();
                if ("RUNNING".equals(previous.status)) {
                    previous.status = "STOPPED";
                    previous.stoppedAtMs = System.currentTimeMillis();
                    runs.updateById(previous);
                }
                ConfigurationRevision latest = configurations.latest();
                ConfigurationRevision defaults = insertConfiguration(catalog.defaults(), latest.version + 1);
                insertSeededRun(defaults);
            });
            snapshot = current();
        }
        events.publish(snapshot);
        return snapshot;
    }

    public void tick() {
        if (!ready) return;
        DashboardSnapshot snapshot;
        synchronized (lock) {
            MonitoringRun run = runs.latest();
            if (!"RUNNING".equals(run.status)) return;
            transactions.executeWithoutResult(status -> {
                ConfigurationRevision config = configurations.latest();
                TelemetrySample previous = samples.recent(run.id, 1).get(0);
                TelemetrySample next = generator.next(previous, config.id, System.currentTimeMillis());
                samples.insert(next);
                if (run.activeAlertId == null && "danger".equals(next.status)) {
                    run.activeAlertId = UUID.randomUUID().toString();
                    run.alertAtMs = next.capturedAtMs;
                    runs.updateById(run);
                }
            });
            snapshot = current();
        }
        events.publish(snapshot);
    }

    private DashboardSnapshot current() {
        MonitoringRun run = runs.latest();
        ConfigurationRevision config = configurations.latest();
        List<TelemetrySample> recent = new ArrayList<>(samples.recent(run.id, 42));
        Collections.reverse(recent);
        return assembler.assemble(run, config, recent);
    }

    private ConfigurationRevision insertConfiguration(ConfigurationPayload payload, long version) {
        ConfigurationRevision config = new ConfigurationRevision();
        config.id = UUID.randomUUID().toString();
        config.version = version;
        config.createdAtMs = System.currentTimeMillis();
        config.model = payload.tool().model();
        config.type = payload.tool().type();
        config.diameter = payload.tool().diameter();
        config.length = payload.tool().length();
        config.toothCount = payload.tool().toothCount();
        config.material = payload.tool().material();
        config.workpieceSize = payload.workpiece().size();
        config.workpieceMaterial = payload.workpiece().material();
        configurations.insert(config);
        return config;
    }

    private void insertSeededRun(ConfigurationRevision config) {
        MonitoringRun run = new MonitoringRun();
        run.id = UUID.randomUUID().toString();
        run.status = "STOPPED";
        run.createdAtMs = System.currentTimeMillis();
        runs.insert(run);
        for (int i = 0; i < 42; i++) {
            samples.insert(generator.seed(run.id, config.id, i, run.createdAtMs - (41L - i) * 1000));
        }
    }
}
