package com.metatwinwear.monitoring.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.metatwinwear.monitoring.model.entity.ToolCatalogRecord;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/** Reads the cutter catalogue stored in SQLite. */
@Mapper
public interface ToolCatalogMapper extends BaseMapper<ToolCatalogRecord> {
    /** Returns the catalogue in the order in which it appears in the source workbook. */
    @Select("SELECT model, sort_order AS sortOrder, type, diameter, length, tooth_count AS toothCount, "
            + "material, description, image_path AS imagePath FROM tool_catalog ORDER BY sort_order")
    List<ToolCatalogRecord> selectCatalogue();
}
