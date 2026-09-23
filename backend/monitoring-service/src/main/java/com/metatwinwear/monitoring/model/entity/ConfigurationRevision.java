package com.metatwinwear.monitoring.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("configuration_revision")
public class ConfigurationRevision {
    @TableId
    public String id;
    public long version;
    public long createdAtMs;
    public String model;
    public String type;
    public double diameter;
    public double length;
    public int toothCount;
    public String material;
    public String workpieceSize;
    public String workpieceMaterial;
}
