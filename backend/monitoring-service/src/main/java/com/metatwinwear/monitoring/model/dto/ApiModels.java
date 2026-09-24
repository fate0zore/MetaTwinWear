package com.metatwinwear.monitoring.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

/** Defines immutable request and response DTOs for the monitoring API. */
public final class ApiModels {

    /** Prevents construction of this DTO namespace. */
    private ApiModels() {
    }

    /** Selected cutter specification.
     *
     * @param model catalogue model identifier
     * @param type cutter type
     * @param diameter cutter diameter
     * @param length cutter length
     * @param toothCount number of cutting teeth
     * @param material cutter material
     */
    public record ToolConfig(
            @NotBlank String model,
            @NotBlank String type,
            @Positive double diameter,
            @Positive double length,
            @Positive int toothCount,
            @NotBlank String material) {
    }

    /** Selected workpiece specification.
     *
     * @param size workpiece dimensions
     * @param material workpiece material
     */
    public record WorkpieceConfig(@NotBlank String size, @NotBlank String material) {
    }

    /** Complete tool and workpiece configuration used in a dashboard snapshot.
     *
     * @param tool selected cutter
     * @param workpiece selected workpiece
     */
    public record ConfigurationPayload(
            @NotNull @Valid ToolConfig tool,
            @NotNull @Valid WorkpieceConfig workpiece) {
    }

    /** Available tool and workpiece options shown in the configuration form.
     *
     * @param toolModels cutter model identifiers
     * @param toolTypes cutter types
     * @param diameters cutter diameters
     * @param lengths cutter lengths
     * @param toothCounts available tooth counts
     * @param materials cutter materials
     * @param workpieceSizes workpiece dimensions
     * @param workpieceMaterials workpiece materials
     */
    public record ConfigurationOptions(
            List<String> toolModels,
            List<String> toolTypes,
            List<Integer> diameters,
            List<Integer> lengths,
            List<Integer> toothCounts,
            List<String> materials,
            List<String> workpieceSizes,
            List<String> workpieceMaterials) {
    }

    /** Process settings associated with the latest sample.
     *
     * @param spindleSpeed spindle speed in revolutions per minute
     * @param feedRate feed rate
     * @param cuttingDepth cutting depth
     * @param cuttingWidth cutting width
     * @param coolant coolant description
     */
    public record ProcessParams(
            int spindleSpeed,
            int feedRate,
            double cuttingDepth,
            double cuttingWidth,
            String coolant) {
    }

    /** Process settings recorded for one point in the history.
     *
     * @param time display timestamp
     * @param spindleSpeed spindle speed
     * @param feedRate feed rate
     * @param cuttingDepth cutting depth
     * @param cuttingWidth cutting width
     */
    public record ProcessSample(
            String time,
            int spindleSpeed,
            int feedRate,
            double cuttingDepth,
            double cuttingWidth) {
    }

    /** Scalar time-series point for the dashboard.
     *
     * @param time display timestamp
     * @param value measured value
     */
    public record TimePoint(String time, double value) {
    }

    /** Named component of a multi-channel signal.
     *
     * @param name channel name
     * @param data channel history
     */
    public record SignalChannel(String name, List<TimePoint> data) {
    }

    /** Sensor value, peak estimate, history, and optional component channels.
     *
     * @param id stable sensor identifier
     * @param title display title
     * @param unit measurement unit
     * @param current latest measurement
     * @param peak peak estimate
     * @param data sensor history
     * @param channels component channels
     */
    public record SensorSeries(
            String id,
            String title,
            String unit,
            double current,
            double peak,
            List<TimePoint> data,
            List<SignalChannel> channels) {
    }

    /** Current tool-wear state and its risk classification.
     *
     * @param currentWear current wear measurement
     * @param threshold critical wear threshold
     * @param wearRate estimated wear rate
     * @param remainingLife estimated remaining life
     * @param stage localized wear stage
     * @param status risk status
     */
    public record WearState(
            double currentWear,
            double threshold,
            double wearRate,
            double remainingLife,
            String stage,
            String status) {
    }

    /** One dashboard recommendation.
     *
     * @param label recommendation category
     * @param value recommendation text
     * @param tone display tone
     */
    public record Recommendation(String label, String value, String tone) {
    }

    /** Active wear-threshold alert details.
     *
     * @param id alert identifier
     * @param createdAt alert creation time
     * @param message alert text
     * @param currentWear current wear measurement
     * @param threshold critical wear threshold
     * @param remainingLife estimated remaining life
     */
    public record ActiveAlert(String id, String createdAt, String message, double currentWear,
                              double threshold, double remainingLife) {
    }

    /** Complete API view of the current monitoring run.
     *
     * @param runId run identifier
     * @param sequence latest sample sequence
     * @param monitoring whether sampling is active
     * @param sampledAt timestamp of the latest sample
     * @param tool selected cutter
     * @param workpiece selected workpiece
     * @param process latest process settings
     * @param wear latest wear state
     * @param signals latest sensor series
     * @param wearHistory measured wear history
     * @param predictionHistory predicted wear history
     * @param processHistory process history
     * @param recommendations dashboard recommendations
     * @param activeAlert current alert, when present
     */
    public record DashboardSnapshot(
            String runId,
            long sequence,
            boolean monitoring,
            String sampledAt,
            ToolConfig tool,
            WorkpieceConfig workpiece,
            ProcessParams process,
            WearState wear,
            List<SensorSeries> signals,
            List<TimePoint> wearHistory,
            List<TimePoint> predictionHistory,
            List<ProcessSample> processHistory,
            List<Recommendation> recommendations,
            ActiveAlert activeAlert) {
    }
}
