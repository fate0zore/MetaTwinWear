package com.metatwinwear.monitoring.simulation;

import com.metatwinwear.monitoring.persistence.TelemetrySample;
import java.util.Random;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SampleGenerator {
    public static final double WEAR_THRESHOLD = 0.3;
    private final Random random = new Random();

    public TelemetrySample seed(String runId, String configurationId, long sequence, long capturedAtMs) {
        TelemetrySample sample = base(runId, configurationId, sequence, capturedAtMs);
        double index = sequence;
        sample.spindleSpeed = (int) Math.round(12000 + Math.sin(index * 0.8) * 260);
        sample.feedRate = (int) Math.round(800 + Math.sin(index * 0.66 + 1) * 32);
        sample.cuttingDepth = round(2 + Math.sin(index * 0.48) * 0.12, 2);
        sample.cuttingWidth = round(10 + Math.sin(index * 0.52 + 1) * 0.34, 2);
        sample.vibrationValue = round(Math.sin(index * 1.35 + 0.2) * 3.6, 2);
        sample.currentValue = round(32 + Math.sin(index * 1.35 + 1) * 5.5, 2);
        sample.soundValue = round(76 + Math.sin(index * 1.35 + 2) * 14.9, 2);
        sample.forceValue = round(300 + Math.sin(index * 1.35 + 0.4) * 38.5, 2);
        sample.forceX = round(310 + Math.sin(index * 1.35 + 0.2) * 36.3, 2);
        sample.forceY = round(240 + Math.sin(index * 1.35 + 1.5) * 31.9, 2);
        sample.forceZ = round(168 + Math.sin(index * 1.35 + 2.3) * 25.3, 2);
        sample.wearValue = round(0.055 + index * (0.125 / 41) + Math.sin(index * 0.6) * 0.003, 3);
        sample.predictedWearValue = round(sample.wearValue + (sequence > 18 ? (sequence - 18) * 0.0022 : 0.006), 3);
        applyWearMetrics(sample);
        return sample;
    }

    public TelemetrySample next(TelemetrySample previous, String configurationId, long capturedAtMs) {
        long index = previous.sequence + 1;
        TelemetrySample sample = base(previous.runId, configurationId, index, capturedAtMs);
        sample.spindleSpeed = (int) Math.round(previous.spindleSpeed + Math.sin(index * 0.8) * 70 + (random.nextDouble() - 0.5) * 50);
        sample.feedRate = (int) Math.round(previous.feedRate + Math.sin(index * 0.63) * 12 + (random.nextDouble() - 0.5) * 10);
        sample.cuttingDepth = round(Math.max(0.5, previous.cuttingDepth + Math.sin(index * 0.48) * 0.035 + (random.nextDouble() - 0.5) * 0.025), 2);
        sample.cuttingWidth = round(Math.max(1, previous.cuttingWidth + Math.sin(index * 0.51) * 0.08 + (random.nextDouble() - 0.5) * 0.06), 2);
        sample.vibrationValue = nextPoint(previous.vibrationValue, index, 0, 7);
        sample.currentValue = nextPoint(previous.currentValue, index, 0.08, 18);
        sample.soundValue = nextPoint(previous.soundValue, index, 0, 13);
        sample.forceValue = nextPoint(previous.forceValue, index, 0, 18);
        sample.forceX = nextPoint(previous.forceX, index, 0, 18);
        sample.forceY = nextPoint(previous.forceY, index + 1, 0, 15);
        sample.forceZ = nextPoint(previous.forceZ, index + 2, 0, 12);
        sample.wearValue = round(Math.min(WEAR_THRESHOLD + 0.05, previous.wearValue + 0.002 + random.nextDouble() * 0.002), 3);
        sample.predictedWearValue = round(sample.wearValue + 0.012, 3);
        applyWearMetrics(sample);
        return sample;
    }

    private TelemetrySample base(String runId, String configurationId, long sequence, long capturedAtMs) {
        TelemetrySample sample = new TelemetrySample();
        sample.id = UUID.randomUUID().toString();
        sample.runId = runId;
        sample.configurationId = configurationId;
        sample.sequence = sequence;
        sample.capturedAtMs = capturedAtMs;
        return sample;
    }

    private double nextPoint(double previous, long index, double drift, double amplitude) {
        return round(previous + Math.sin(index * 1.27) * amplitude * 0.48
                + (random.nextDouble() - 0.5) * amplitude + drift, 2);
    }

    private void applyWearMetrics(TelemetrySample sample) {
        sample.wearRate = round(0.012 + Math.max(0, sample.wearValue - 0.18) * 0.03, 3);
        sample.remainingLife = round(Math.max(0, 18.6 - Math.max(0, sample.wearValue - 0.18) * 100), 1);
        sample.status = sample.wearValue >= WEAR_THRESHOLD ? "danger" : sample.wearValue >= 0.18 ? "warning" : "normal";
        sample.stage = switch (sample.status) {
            case "danger" -> "临界状态";
            case "warning" -> "稳定磨损";
            default -> "轻微磨损";
        };
    }

    private double round(double value, int digits) {
        double factor = Math.pow(10, digits);
        return Math.round(value * factor) / factor;
    }
}
