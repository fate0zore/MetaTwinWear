package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.ToolCatalogRecord;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

/** Provides database access to the imported tool catalogue. */
@Mapper
public interface ToolCatalogMapper extends BaseMapper<ToolCatalogRecord> {

    /** Returns catalogue entries in their source workbook order. */
    List<ToolCatalogRecord> selectCatalogue();
}
