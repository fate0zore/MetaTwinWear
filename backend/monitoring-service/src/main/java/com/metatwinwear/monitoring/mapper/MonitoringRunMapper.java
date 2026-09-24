package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.MonitoringRun;
import org.apache.ibatis.annotations.Mapper;

/** Provides persistence operations for monitoring runs. */
@Mapper
public interface MonitoringRunMapper extends BaseMapper<MonitoringRun> {

    /** Returns the most recently inserted monitoring run, or {@code null} when none exists. */
    MonitoringRun latest();
}
