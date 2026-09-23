package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.ConfigurationRevision;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ConfigurationRevisionMapper extends BaseMapper<ConfigurationRevision> {
    @Select("SELECT * FROM configuration_revision ORDER BY version DESC LIMIT 1")
    ConfigurationRevision latest();
}
