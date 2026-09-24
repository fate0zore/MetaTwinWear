package com.metatwinwear.monitoring.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/** Persistence entity for one telemetry sample. */
@TableName("telemetry_sample")
public class TelemetrySample {
    @TableId
    public String id;
    public String runId;
    public long sequence;
    public long capturedAtMs;
    public int spindleSpeed;
    public int feedRate;
    public double cuttingDepth;
    public double cuttingWidth;
    public double vibrationValue;
    public double currentValue;
    public double soundValue;
    public double forceValue;
    public double forceX;
    public double forceY;
    public double forceZ;
    public double wearValue;
    public double predictedWearValue;
    public double wearRate;
    public double remainingLife;
    public String stage;
    public String status;
}
