package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.TelemetrySample;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface TelemetrySampleMapper extends BaseMapper<TelemetrySample> {
    @Select("SELECT * FROM telemetry_sample WHERE run_id = #{runId} ORDER BY sequence DESC LIMIT #{limit}")
    List<TelemetrySample> recent(@Param("runId") String runId, @Param("limit") int limit);
}
