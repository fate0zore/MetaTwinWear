package com.metatwinwear.monitoring.service;

import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.model.dto.ToolCatalogItem;
import java.util.List;
import org.springframework.core.io.Resource;

/** Defines catalogue queries and conversions used by the monitoring API. */
public interface ToolCatalogService {
    String DEFAULT_TOOL_MODEL = "2F366-1200-050-TD   1745";

    /** Lists catalogue items with their same-origin image URLs.
     *
     * @return immutable catalogue list
     */
    List<ToolCatalogItem> list();

    /** Returns distinct configuration choices derived from the catalogue.
     *
     * @return available options
     */
    ConfigurationOptions options();

    /** Returns the recommended default tool and workpiece configuration.
     *
     * @return default configuration
     */
    ConfigurationPayload defaults();

    /** Resolves a catalogue image after checking that it remains under the image root.
     *
     * @param model catalogue model identifier
     * @return image resource
     */
    Resource image(String model);
}
