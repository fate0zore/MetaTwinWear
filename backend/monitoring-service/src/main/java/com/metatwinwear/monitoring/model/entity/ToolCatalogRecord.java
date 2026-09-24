package com.metatwinwear.monitoring.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/** Persistence entity for a cutter specification imported from the local tool catalogue. */
@TableName("tool_catalog")
public class ToolCatalogRecord {
    @TableId
    public String model;
    public int sortOrder;
    public String type;
    public double diameter;
    public double length;
    public int toothCount;
    public String material;
    public String description;
    public String imagePath;
}
