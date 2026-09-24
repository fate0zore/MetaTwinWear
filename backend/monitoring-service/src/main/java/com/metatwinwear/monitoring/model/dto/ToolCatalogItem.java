package com.metatwinwear.monitoring.model.dto;

/** Public cutter catalogue item returned to the dashboard.
 *
 * @param model catalogue model identifier
 * @param type cutter type
 * @param diameter cutter diameter
 * @param length cutter length
 * @param toothCount number of cutting teeth
 * @param material cutter material
 * @param description product description
 * @param imageUrl same-origin preview image URL
 */
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
