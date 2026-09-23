package com.metatwinwear.monitoring.model.dto;

/** Public cutter catalogue item returned to the dashboard. */
public record ToolCatalogItem(
        String model,
        String type,
        double diameter,
        double length,
        int toothCount,
        String material,
        String description,
        String imageUrl) {
}
