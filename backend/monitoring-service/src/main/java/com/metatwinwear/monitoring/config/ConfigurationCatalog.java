package com.metatwinwear.monitoring.config;

import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.model.dto.ApiModels.ToolConfig;
import com.metatwinwear.monitoring.model.dto.ApiModels.WorkpieceConfig;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ConfigurationCatalog {
    private static final ConfigurationOptions OPTIONS = new ConfigurationOptions(
            List.of("Φ12 立铣刀（硬质合金）", "Φ10 立铣刀（硬质合金）", "Φ16 球头铣刀（硬质合金）"),
            List.of("立铣刀", "球头铣刀", "键槽铣刀"),
            List.of(8, 10, 12, 16),
            List.of(50, 75, 100, 125),
            List.of(2, 3, 4, 6),
            List.of("硬质合金", "高速钢", "陶瓷合金"),
            List.of("80 × 60 × 40", "120 × 80 × 50", "160 × 100 × 60"),
            List.of("镍基高温合金 (Inconel 718)", "钛合金 (TC4)", "铝合金 (7075)", "模具钢 (S136)"));

    public ConfigurationOptions options() {
        return OPTIONS;
    }

    public ConfigurationPayload defaults() {
        return new ConfigurationPayload(
                new ToolConfig("Φ12 立铣刀（硬质合金）", "立铣刀", 12, 75, 4, "硬质合金"),
                new WorkpieceConfig("120 × 80 × 50", "镍基高温合金 (Inconel 718)"));
    }

    public void validate(ConfigurationPayload payload) {
        ToolConfig tool = payload.tool();
        WorkpieceConfig workpiece = payload.workpiece();
        if (!OPTIONS.toolModels().contains(tool.model())
                || !OPTIONS.toolTypes().contains(tool.type())
                || !OPTIONS.diameters().contains((int) tool.diameter()) || tool.diameter() != (int) tool.diameter()
                || !OPTIONS.lengths().contains((int) tool.length()) || tool.length() != (int) tool.length()
                || !OPTIONS.toothCounts().contains(tool.toothCount())
                || !OPTIONS.materials().contains(tool.material())
                || !OPTIONS.workpieceSizes().contains(workpiece.size())
                || !OPTIONS.workpieceMaterials().contains(workpiece.material())) {
            throw new IllegalArgumentException("配置值不在可选范围内");
        }
    }
}
