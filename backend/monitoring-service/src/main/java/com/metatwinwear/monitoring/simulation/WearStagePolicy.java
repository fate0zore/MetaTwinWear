package com.metatwinwear.monitoring.simulation;

/**
 * Classifies simulated tool wear into five display stages and three risk levels.
 * Each precritical stage covers one quarter of the configured wear threshold.
 */
public final class WearStagePolicy {
    public static final double DEFAULT_THRESHOLD = 0.3;

    private WearStagePolicy() {
    }

    /**
     * Classifies a wear value using four equal threshold subdivisions.
     * Invalid thresholds and non-finite wear values fall back to the initial stage.
     *
     * @param currentWear current wear measurement in millimetres
     * @param threshold critical wear threshold in millimetres
     * @return stage label, stage code, and associated three-level risk status
     */
    public static Classification classify(double currentWear, double threshold) {
        if (!Double.isFinite(threshold) || threshold <= 0) {
            return stage(0);
        }

        double wear = Double.isFinite(currentWear) ? Math.max(0, currentWear) : 0;
        double stageSpan = threshold / 4;
        if (wear < stageSpan) return stage(0);
        if (wear < stageSpan * 2) return stage(1);
        if (wear < stageSpan * 3) return stage(2);
        if (wear < threshold) return stage(3);
        return stage(4);
    }

    private static Classification stage(int index) {
        return switch (index) {
            case 1 -> new Classification("轻微磨损", "light", "normal", "stage-light");
            case 2 -> new Classification("稳定磨损", "stable", "warning", "stage-stable");
            case 3 -> new Classification("加速磨损", "accelerated", "warning", "stage-accelerated");
            case 4 -> new Classification("临界状态", "critical", "danger", "stage-critical");
            default -> new Classification("初始状态", "initial", "normal", "stage-initial");
        };
    }

    /**
     * Result of applying the wear stage policy.
     *
     * @param label user-facing stage label
     * @param code stable machine-readable stage code
     * @param status three-level risk status used by alerts
     * @param recommendationTone stage color key used by the dashboard
     */
    public record Classification(String label, String code, String status, String recommendationTone) {
    }
}
