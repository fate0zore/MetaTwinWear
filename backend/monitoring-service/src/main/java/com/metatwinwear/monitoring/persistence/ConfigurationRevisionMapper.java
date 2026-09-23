package com.metatwinwear.monitoring.persistence;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ConfigurationRevisionMapper extends BaseMapper<ConfigurationRevision> {
    @Select("SELECT * FROM configuration_revision ORDER BY version DESC LIMIT 1")
    ConfigurationRevision latest();
}
