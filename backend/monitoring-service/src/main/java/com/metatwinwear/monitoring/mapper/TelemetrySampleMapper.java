package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/** Provides persistence operations for telemetry samples. */
@Mapper
public interface TelemetrySampleMapper extends BaseMapper<TelemetrySample> {

    /** Returns at most {@code limit} samples for a run, newest sequence first. */
    List<TelemetrySample> recent(@Param("runId") String runId, @Param("limit") int limit);
}
