package com.metatwinwear.monitoring.service;

import com.metatwinwear.monitoring.model.dto.ApiModels.*;
import com.metatwinwear.monitoring.model.entity.ConfigurationRevision;
import com.metatwinwear.monitoring.model.entity.MonitoringRun;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import com.metatwinwear.monitoring.simulation.SampleGenerator;
import com.metatwinwear.monitoring.simulation.WearStagePolicy;
import java.time.Instant;
import java.util.List;
import java.util.function.ToDoubleFunction;
import org.springframework.stereotype.Component;

@Component
public class DashboardAssembler {
    public DashboardSnapshot assemble(MonitoringRun run, ConfigurationRevision config, List<TelemetrySample> samples) {
        TelemetrySample latest = samples.get(samples.size() - 1);
        WearStagePolicy.Classification classification = WearStagePolicy.classify(latest.wearValue,
                SampleGenerator.WEAR_THRESHOLD);
        WearState wear = new WearState(latest.wearValue, SampleGenerator.WEAR_THRESHOLD, latest.wearRate,
                latest.remainingLife, classification.label(), classification.status());
        List<SensorSeries> signals = List.of(
                sensor("vibration", "振动信号", "m/s²", samples, s -> s.vibrationValue, null),
                sensor("current", "电流信号", "A", samples, s -> s.currentValue, null),
                sensor("sound", "声发射信号", "dB", samples, s -> s.soundValue, null),
                sensor("force", "切削力信号", "N", samples, s -> s.forceValue,
                        List.of(channel("Fx", samples, s -> s.forceX), channel("Fy", samples, s -> s.forceY),
                                channel("Fz", samples, s -> s.forceZ))));
        List<ProcessSample> processHistory = samples.stream().map(s -> new ProcessSample(label(s), s.spindleSpeed,
                s.feedRate, s.cuttingDepth, s.cuttingWidth)).toList();
        String riskValue = switch (wear.status()) {
            case "danger" -> "高";
            case "warning" -> "较高";
            default -> "低";
        };
        String riskTone = switch (wear.status()) {
            case "danger" -> "danger";
            case "warning" -> "warning";
            default -> "success";
        };
        List<Recommendation> recommendations = List.of(
                new Recommendation("当前状态", wear.stage(), classification.recommendationTone()),
                new Recommendation("风险等级", riskValue, riskTone),
                new Recommendation("剩余寿命 RUL", "≤ " + Math.max(5, (int) Math.ceil(wear.remainingLife())) + " min", riskTone),
                new Recommendation("建议", "完成当前加工后更换刀具", "info"),
                new Recommendation("建议剩余加工时间", "≤ 5 min", riskTone),
                new Recommendation("建议监测参数", "主轴振动、切削力", "info"));
        ActiveAlert alert = run.activeAlertId == null ? null : new ActiveAlert(run.activeAlertId,
                Instant.ofEpochMilli(run.alertAtMs).toString(), "刀具磨损达到阈值", wear.currentWear(),
                wear.threshold(), wear.remainingLife());
        return new DashboardSnapshot(run.id, latest.sequence, "RUNNING".equals(run.status),
                Instant.ofEpochMilli(latest.capturedAtMs).toString(),
                new ToolConfig(config.model, config.type, config.diameter, config.length, config.toothCount,
                        config.material),
                new WorkpieceConfig(config.workpieceSize, config.workpieceMaterial),
                new ProcessParams(latest.spindleSpeed, latest.feedRate, latest.cuttingDepth, latest.cuttingWidth, "水溶性切削液"),
                wear, signals, points(samples, s -> s.wearValue), points(samples, s -> s.predictedWearValue),
                processHistory, recommendations, alert);
    }

    private SensorSeries sensor(String id, String title, String unit, List<TelemetrySample> samples,
                                ToDoubleFunction<TelemetrySample> value, List<SignalChannel> channels) {
        double current = Math.abs(value.applyAsDouble(samples.get(samples.size() - 1)));
        return new SensorSeries(id, title, unit, current, Math.round(current * 76) / 100.0,
                points(samples, value), channels);
    }

    private SignalChannel channel(String name, List<TelemetrySample> samples, ToDoubleFunction<TelemetrySample> value) {
        return new SignalChannel(name, points(samples, value));
    }

    private List<TimePoint> points(List<TelemetrySample> samples, ToDoubleFunction<TelemetrySample> value) {
        return samples.stream().map(s -> new TimePoint(label(s), value.applyAsDouble(s))).toList();
    }

    private String label(TelemetrySample sample) {
        long seconds = sample.sequence;
        return "%02d:%02d".formatted(seconds / 60, seconds % 60);
    }
}
