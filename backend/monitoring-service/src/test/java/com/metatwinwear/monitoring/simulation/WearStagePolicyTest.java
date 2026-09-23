package com.metatwinwear.monitoring.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class WearStagePolicyTest {
    private static final double THRESHOLD = 0.3;

    @Test
    void classifiesEveryQuarterBoundaryIntoTheNextStage() {
        assertStage(0, "初始状态", "normal", "stage-initial");
        assertStage(Math.nextDown(THRESHOLD / 4), "初始状态", "normal", "stage-initial");
        assertStage(THRESHOLD / 4, "轻微磨损", "normal", "stage-light");
        assertStage(Math.nextDown(THRESHOLD / 2), "轻微磨损", "normal", "stage-light");
        assertStage(THRESHOLD / 2, "稳定磨损", "warning", "stage-stable");
        assertStage(Math.nextDown(THRESHOLD * 3 / 4), "稳定磨损", "warning", "stage-stable");
        assertStage(THRESHOLD * 3 / 4, "加速磨损", "warning", "stage-accelerated");
        assertStage(Math.nextDown(THRESHOLD), "加速磨损", "warning", "stage-accelerated");
        assertStage(THRESHOLD, "临界状态", "danger", "stage-critical");
        assertStage(THRESHOLD * 1.25, "临界状态", "danger", "stage-critical");
        assertStage(THRESHOLD * 1.5, "临界状态", "danger", "stage-critical");
    }

    @Test
    void invalidInputsFallBackToInitialStage() {
        assertStage(Double.NaN, "初始状态", "normal", "stage-initial");
        WearStagePolicy.Classification invalidThreshold = WearStagePolicy.classify(THRESHOLD, 0);
        assertEquals("初始状态", invalidThreshold.label());
        assertEquals("normal", invalidThreshold.status());
    }

    private void assertStage(double wear, String label, String status, String tone) {
        WearStagePolicy.Classification result = WearStagePolicy.classify(wear, THRESHOLD);
        assertEquals(label, result.label());
        assertEquals(status, result.status());
        assertEquals(tone, result.recommendationTone());
    }
}
