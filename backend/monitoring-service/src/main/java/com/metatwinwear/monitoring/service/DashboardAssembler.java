package com.metatwinwear.monitoring.service;

import com.metatwinwear.monitoring.model.dto.ApiModels.ActiveAlert;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.model.dto.ApiModels.DashboardSnapshot;
import com.metatwinwear.monitoring.model.dto.ApiModels.ProcessParams;
import com.metatwinwear.monitoring.model.dto.ApiModels.ProcessSample;
import com.metatwinwear.monitoring.model.dto.ApiModels.Recommendation;
import com.metatwinwear.monitoring.model.dto.ApiModels.SensorSeries;
import com.metatwinwear.monitoring.model.dto.ApiModels.SignalChannel;
import com.metatwinwear.monitoring.model.dto.ApiModels.TimePoint;
import com.metatwinwear.monitoring.model.dto.ApiModels.WearState;
import com.metatwinwear.monitoring.model.entity.MonitoringRun;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import com.metatwinwear.monitoring.simulation.SampleGenerator;
import com.metatwinwear.monitoring.simulation.WearStagePolicy;
import java.time.Instant;
import java.util.List;
import java.util.function.ToDoubleFunction;
import org.springframework.stereotype.Component;

/** Converts a run and its telemetry window into the dashboard API model. */
@Component
public class DashboardAssembler {
    private static final String COOLANT_DESCRIPTION = "水溶性切削液";

    /** Assembles the full dashboard snapshot without exposing persistence entities.
     *
     * @param run persisted monitoring run
     * @param config dashboard configuration DTO
     * @param samples ordered telemetry samples
     * @return immutable dashboard snapshot
     */
    public DashboardSnapshot assemble(MonitoringRun run, ConfigurationPayload config,
                                       List<TelemetrySample> samples) {
        TelemetrySample latest = samples.get(samples.size() - 1);
        WearStagePolicy.Classification classification = WearStagePolicy.classify(
                latest.wearValue, SampleGenerator.WEAR_THRESHOLD);
        WearState wear = new WearState(latest.wearValue, SampleGenerator.WEAR_THRESHOLD, latest.wearRate,
                latest.remainingLife, classification.label(), classification.status());
        List<SensorSeries> signals = List.of(
                sensor("vibration", "振动信号", "m/s²", samples, sample -> sample.vibrationValue, null),
                sensor("current", "电流信号", "A", samples, sample -> sample.currentValue, null),
                sensor("sound", "声发射信号", "dB", samples, sample -> sample.soundValue, null),
                sensor("force", "切削力信号", "N", samples, sample -> sample.forceValue,
                        List.of(channel("Fx", samples, sample -> sample.forceX),
                                channel("Fy", samples, sample -> sample.forceY),
                                channel("Fz", samples, sample -> sample.forceZ))));
        List<ProcessSample> processHistory = samples.stream()
                .map(sample -> new ProcessSample(label(sample), sample.spindleSpeed, sample.feedRate,
                        sample.cuttingDepth, sample.cuttingWidth))
                .toList();
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
                new Recommendation("剩余寿命 RUL",
                        "≤ " + Math.max(5, (int) Math.ceil(wear.remainingLife())) + " min", riskTone),
                new Recommendation("建议", "完成当前加工后更换刀具", "info"),
                new Recommendation("建议剩余加工时间", "≤ 5 min", riskTone),
                new Recommendation("建议监测参数", "主轴振动、切削力", "info"));
        ActiveAlert alert = run.activeAlertId == null ? null : new ActiveAlert(
                run.activeAlertId,
                Instant.ofEpochMilli(run.alertAtMs).toString(),
                "刀具磨损达到阈值",
                wear.currentWear(),
                wear.threshold(),
                wear.remainingLife());
        ProcessParams process = new ProcessParams(latest.spindleSpeed, latest.feedRate,
                latest.cuttingDepth, latest.cuttingWidth, COOLANT_DESCRIPTION);
        return new DashboardSnapshot(
                run.id,
                latest.sequence,
                "RUNNING".equals(run.status),
                Instant.ofEpochMilli(latest.capturedAtMs).toString(),
                config.tool(),
                config.workpiece(),
                process,
                wear,
                signals,
                points(samples, sample -> sample.wearValue),
                points(samples, sample -> sample.predictedWearValue),
                processHistory,
                recommendations,
                alert);
    }

    /** Creates a sensor series with its current magnitude, peak estimate, and history.
     *
     * @param id sensor identifier
     * @param title sensor display title
     * @param unit measurement unit
     * @param samples ordered telemetry samples
     * @param value sensor value selector
     * @param channels optional component channels
     * @return dashboard sensor series
     */
    private SensorSeries sensor(String id, String title, String unit, List<TelemetrySample> samples,
                                ToDoubleFunction<TelemetrySample> value, List<SignalChannel> channels) {
        double current = Math.abs(value.applyAsDouble(samples.get(samples.size() - 1)));
        double peak = Math.round(current * 76) / 100.0;
        return new SensorSeries(id, title, unit, current, peak, points(samples, value), channels);
    }

    /** Creates a named force channel from the sample history.
     *
     * @param name channel name
     * @param samples ordered telemetry samples
     * @param value channel value selector
     * @return channel DTO
     */
    private SignalChannel channel(String name, List<TelemetrySample> samples,
                                  ToDoubleFunction<TelemetrySample> value) {
        return new SignalChannel(name, points(samples, value));
    }

    /** Converts sample values into API time points.
     *
     * @param samples ordered telemetry samples
     * @param value selected sample value
     * @return immutable time series
     */
    private List<TimePoint> points(List<TelemetrySample> samples, ToDoubleFunction<TelemetrySample> value) {
        return samples.stream()
                .map(sample -> new TimePoint(label(sample), value.applyAsDouble(sample)))
                .toList();
    }

    /** Formats a sample sequence as a minute-and-second dashboard label.
     *
     * @param sample telemetry sample
     * @return display timestamp
     */
    private String label(TelemetrySample sample) {
        long seconds = sample.sequence;
        return "%02d:%02d".formatted(seconds / 60, seconds % 60);
    }
}
