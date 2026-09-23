package com.metatwinwear.monitoring.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("monitoring_run")
public class MonitoringRun {
    @TableId
    public String id;
    public String status;
    public long createdAtMs;
    public Long stoppedAtMs;
    public String activeAlertId;
    public Long alertAtMs;
}
