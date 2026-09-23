package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.MonitoringRun;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MonitoringRunMapper extends BaseMapper<MonitoringRun> {
    @Select("SELECT * FROM monitoring_run ORDER BY rowid DESC LIMIT 1")
    MonitoringRun latest();
}
