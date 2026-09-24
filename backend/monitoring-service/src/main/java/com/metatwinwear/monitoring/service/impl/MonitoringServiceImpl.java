package com.metatwinwear.monitoring.service.impl;

import com.metatwinwear.common.exception.ApiException;
import com.metatwinwear.common.response.ApiStatus;
import com.metatwinwear.monitoring.service.DashboardAssembler;
import com.metatwinwear.monitoring.service.MonitoringService;
import com.metatwinwear.monitoring.service.SseHub;
import com.metatwinwear.monitoring.service.ToolCatalogService;
import com.metatwinwear.monitoring.mapper.MonitoringRunMapper;
import com.metatwinwear.monitoring.mapper.TelemetrySampleMapper;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.model.entity.MonitoringRun;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import com.metatwinwear.monitoring.simulation.SampleGenerator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Coordinates monitoring state transitions, persistence, and snapshot construction. */
@Service
public class MonitoringServiceImpl implements MonitoringService {
    private static final String RUNNING_STATUS = "RUNNING";
    private static final String STOPPED_STATUS = "STOPPED";
    private static final int INITIAL_SAMPLE_COUNT = 42;

    private final Object stateLock = new Object();
    private final MonitoringRunMapper runs;
    private final TelemetrySampleMapper samples;
    private final ToolCatalogService catalog;
    private final SampleGenerator generator;
    private final DashboardAssembler assembler;
    private final SseHub events;
    private final TransactionTemplate transactions;
    private volatile boolean ready;

    /** Creates the service implementation with persistence, simulation, and event collaborators.
     *
     * @param runs monitoring run mapper
     * @param samples telemetry sample mapper
     * @param catalog tool catalogue service
     * @param generator telemetry sample generator
     * @param assembler dashboard DTO assembler
     * @param events server-sent event hub
     * @param transactions transaction template
     */
    public MonitoringServiceImpl(MonitoringRunMapper runs, TelemetrySampleMapper samples,
                                 ToolCatalogService catalog, SampleGenerator generator,
                                 DashboardAssembler assembler, SseHub events,
                                 TransactionTemplate transactions) {
        this.runs = runs;
        this.samples = samples;
        this.catalog = catalog;
        this.generator = generator;
        this.assembler = assembler;
        this.events = events;
        this.transactions = transactions;
    }

    /** Initializes persisted state and stops a run left active by a previous process. */
    @Override
    public void initialize() {
        synchronized (stateLock) {
            transactions.executeWithoutResult(status -> {
                MonitoringRun run = runs.latest();
                if (run == null) {
                    insertSeededRun();
                } else if (RUNNING_STATUS.equals(run.status)) {
                    run.status = STOPPED_STATUS;
                    run.stoppedAtMs = System.currentTimeMillis();
                    runs.updateById(run);
                }
            });
            ready = true;
        }
    }

    /** Returns the latest persisted monitoring data as an API snapshot.
     *
     * @return API view of the latest run
     */
    @Override
    public DashboardSnapshot snapshot() {
        synchronized (stateLock) {
            return current();
        }
    }

    /** Returns the available tool and workpiece choices.
     *
     * @return available configuration options
     */
    @Override
    public ConfigurationOptions options() {
        return catalog.options();
    }

    /** Starts monitoring and publishes the new snapshot to active event streams.
     *
     * @return API view of the updated run
     */
    @Override
    public DashboardSnapshot start() {
        return changeState(true);
    }

    /** Stops monitoring and publishes the new snapshot to active event streams.
     *
     * @return API view of the updated run
     */
    @Override
    public DashboardSnapshot stop() {
        return changeState(false);
    }

    /** Creates a fresh stopped run while preserving all existing runs and samples.
     *
     * @return API view of the new run
     */
    @Override
    public DashboardSnapshot reset() {
        DashboardSnapshot snapshot;
        synchronized (stateLock) {
            transactions.executeWithoutResult(status -> {
                MonitoringRun previous = runs.latest();
                if (RUNNING_STATUS.equals(previous.status)) {
                    previous.status = STOPPED_STATUS;
                    previous.stoppedAtMs = System.currentTimeMillis();
                    runs.updateById(previous);
                }
                insertSeededRun();
            });
            snapshot = current();
        }
        events.publish(snapshot);
        return snapshot;
    }

    /** Persists one generated sample when the latest run is active. */
    @Override
    public void tick() {
        if (!ready) {
            return;
        }

        DashboardSnapshot snapshot;
        synchronized (stateLock) {
            if (!ready) {
                return;
            }
            snapshot = transactions.execute(status -> {
                MonitoringRun run = runs.latest();
                if (!RUNNING_STATUS.equals(run.status)) {
                    return null;
                }

                List<TelemetrySample> previousSamples = samples.recent(run.id, 1);
                if (previousSamples.isEmpty()) {
                    throw new ApiException(ApiStatus.INTERNAL_SERVER_ERROR, "监控采样状态异常");
                }

                TelemetrySample next = generator.next(previousSamples.get(0), System.currentTimeMillis());
                samples.insert(next);
                if (run.activeAlertId == null && "danger".equals(next.status)) {
                    run.activeAlertId = UUID.randomUUID().toString();
                    run.alertAtMs = next.capturedAtMs;
                    runs.updateById(run);
                }
                return current();
            });
        }

        if (snapshot != null) {
            events.publish(snapshot);
        }
    }

    /** Opens an event stream initialized from the current persisted snapshot.
     *
     * @return server-sent event stream
     */
    @Override
    public SseEmitter subscribeEvents() {
        synchronized (stateLock) {
            return events.subscribe(current());
        }
    }

    /** Updates the run state transactionally and publishes the committed snapshot.
     *
     * @param running true to start monitoring, false to stop it
     * @return API view of the updated run
     */
    private DashboardSnapshot changeState(boolean running) {
        DashboardSnapshot snapshot;
        synchronized (stateLock) {
            transactions.executeWithoutResult(status -> {
                MonitoringRun run = runs.latest();
                String nextStatus = running ? RUNNING_STATUS : STOPPED_STATUS;
                if (!Objects.equals(nextStatus, run.status)) {
                    run.status = nextStatus;
                    run.stoppedAtMs = running ? null : System.currentTimeMillis();
                    runs.updateById(run);
                }
            });
            snapshot = current();
        }
        events.publish(snapshot);
        return snapshot;
    }

    /** Assembles a snapshot from the latest run and its newest telemetry samples.
     *
     * @return API view of the current run
     */
    private DashboardSnapshot current() {
        MonitoringRun run = runs.latest();
        if (run == null) {
            throw new ApiException(ApiStatus.INTERNAL_SERVER_ERROR, "监控运行状态不存在");
        }
        List<TelemetrySample> recentSamples = new ArrayList<>(samples.recent(run.id, INITIAL_SAMPLE_COUNT));
        Collections.reverse(recentSamples);
        if (recentSamples.isEmpty()) {
            throw new ApiException(ApiStatus.INTERNAL_SERVER_ERROR, "监控采样状态不存在");
        }
        return assembler.assemble(run, catalog.defaults(), recentSamples);
    }

    /** Creates a stopped run and its initial sample window within the caller's transaction. */
    private void insertSeededRun() {
        MonitoringRun run = new MonitoringRun();
        run.id = UUID.randomUUID().toString();
        run.status = STOPPED_STATUS;
        run.createdAtMs = System.currentTimeMillis();
        runs.insert(run);

        for (int i = 0; i < INITIAL_SAMPLE_COUNT; i++) {
            long capturedAtMs = run.createdAtMs - (INITIAL_SAMPLE_COUNT - 1L - i) * 1000;
            samples.insert(generator.seed(run.id, i, capturedAtMs));
        }
    }
}
