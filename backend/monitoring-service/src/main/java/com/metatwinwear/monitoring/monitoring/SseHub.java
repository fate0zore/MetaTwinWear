package com.metatwinwear.monitoring.monitoring;

import com.metatwinwear.monitoring.api.ApiModels.DashboardSnapshot;
import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class SseHub {
    private final CopyOnWriteArrayList<SseEmitter> clients = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(DashboardSnapshot snapshot) {
        SseEmitter emitter = new SseEmitter(0L);
        emitter.onCompletion(() -> clients.remove(emitter));
        emitter.onTimeout(() -> clients.remove(emitter));
        emitter.onError(error -> clients.remove(emitter));
        try {
            send(emitter, snapshot);
            clients.add(emitter);
        } catch (IOException error) {
            emitter.completeWithError(error);
        }
        return emitter;
    }

    public void publish(DashboardSnapshot snapshot) {
        for (SseEmitter emitter : clients) {
            try {
                send(emitter, snapshot);
            } catch (IOException | IllegalStateException error) {
                clients.remove(emitter);
                emitter.complete();
            }
        }
    }

    @Scheduled(fixedDelay = 15000)
    public void heartbeat() {
        for (SseEmitter emitter : clients) {
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ok"));
            } catch (IOException | IllegalStateException error) {
                clients.remove(emitter);
                emitter.complete();
            }
        }
    }

    private void send(SseEmitter emitter, DashboardSnapshot snapshot) throws IOException {
        emitter.send(SseEmitter.event().name("snapshot")
                .id(snapshot.runId() + ":" + snapshot.sequence()).data(snapshot));
    }
}
