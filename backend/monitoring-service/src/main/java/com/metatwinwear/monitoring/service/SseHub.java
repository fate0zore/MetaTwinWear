package com.metatwinwear.monitoring.service;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import java.io.IOException;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Tracks event-stream clients and publishes wrapped monitoring updates. */
@Component
public class SseHub {
    private static final long NO_TIMEOUT = 0L;
    private static final String SNAPSHOT_EVENT = "snapshot";
    private static final String HEARTBEAT_EVENT = "heartbeat";

    private final Set<SseEmitter> clients = ConcurrentHashMap.newKeySet();

    /** Registers a client and sends its initial monitoring snapshot.
     *
     * @param snapshot initial dashboard snapshot
     * @return event stream handle
     */
    public SseEmitter subscribe(DashboardSnapshot snapshot) {
        SseEmitter emitter = new SseEmitter(NO_TIMEOUT);
        emitter.onCompletion(() -> clients.remove(emitter));
        emitter.onTimeout(() -> clients.remove(emitter));
        emitter.onError(error -> clients.remove(emitter));
        clients.add(emitter);
        try {
            send(emitter, snapshot);
        } catch (IOException | IllegalStateException error) {
            clients.remove(emitter);
            emitter.completeWithError(error);
        }
        return emitter;
    }

    /** Sends the latest snapshot to each connected client and removes disconnected clients.
     *
     * @param snapshot latest dashboard snapshot
     */
    public void publish(DashboardSnapshot snapshot) {
        Iterator<SseEmitter> iterator = clients.iterator();
        while (iterator.hasNext()) {
            SseEmitter emitter = iterator.next();
            try {
                send(emitter, snapshot);
            } catch (IOException | IllegalStateException error) {
                iterator.remove();
                emitter.complete();
            }
        }
    }

    /** Sends a keepalive event every 15 seconds. */
    @Scheduled(fixedDelay = 15000)
    public void heartbeat() {
        Iterator<SseEmitter> iterator = clients.iterator();
        while (iterator.hasNext()) {
            SseEmitter emitter = iterator.next();
            try {
                emitter.send(SseEmitter.event()
                        .name(HEARTBEAT_EVENT)
                        .data(ApiResponse.success("连接正常", "ok")));
            } catch (IOException | IllegalStateException error) {
                iterator.remove();
                emitter.complete();
            }
        }
    }

    /** Sends one wrapped snapshot event to a client.
     *
     * @param emitter event stream handle
     * @param snapshot dashboard snapshot
     * @throws IOException when the event cannot be written
     */
    private void send(SseEmitter emitter, DashboardSnapshot snapshot) throws IOException {
        emitter.send(SseEmitter.event()
                .name(SNAPSHOT_EVENT)
                .id(snapshot.runId() + ":" + snapshot.sequence())
                .data(ApiResponse.success(snapshot)));
    }
}
