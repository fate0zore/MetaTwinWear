package com.metatwinwear.monitoring.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public final class ApiModels {
    private ApiModels() {
    }

    public record ToolConfig(
            @NotBlank String model,
            @NotBlank String type,
            @Positive double diameter,
            @Positive double length,
            @Positive int toothCount,
            @NotBlank String material) {
    }

    public record WorkpieceConfig(@NotBlank String size, @NotBlank String material) {
    }

    public record ConfigurationPayload(@NotNull @Valid ToolConfig tool, @NotNull @Valid WorkpieceConfig workpiece) {
    }

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

    public record ProcessParams(int spindleSpeed, int feedRate, double cuttingDepth, double cuttingWidth, String coolant) {
    }

    public record ProcessSample(String time, int spindleSpeed, int feedRate, double cuttingDepth, double cuttingWidth) {
    }

    public record TimePoint(String time, double value) {
    }

    public record SignalChannel(String name, List<TimePoint> data) {
    }

    public record SensorSeries(
            String id,
            String title,
            String unit,
            double current,
            double peak,
            List<TimePoint> data,
            List<SignalChannel> channels) {
    }

    public record WearState(double currentWear, double threshold, double wearRate, double remainingLife,
                            String stage, String status) {
    }

    public record Recommendation(String label, String value, String tone) {
    }

    public record ActiveAlert(String id, String createdAt, String message, double currentWear,
                              double threshold, double remainingLife) {
    }

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
