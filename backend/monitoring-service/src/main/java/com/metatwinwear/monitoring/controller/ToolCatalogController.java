package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ToolCatalogItem;
import com.metatwinwear.monitoring.service.ToolCatalogService;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** HTTP endpoints for cutter catalogue records and preview images. */
@RestController
@RequestMapping("/api/v1/tools")
public class ToolCatalogController {
    private final ToolCatalogService tools;

    /** Creates the controller with the catalogue service. */
    public ToolCatalogController(ToolCatalogService tools) {
        this.tools = tools;
    }

    /** Lists searchable cutter records and their preview URLs. */
    @GetMapping
    public ApiResponse<List<ToolCatalogItem>> list() {
        return ApiResponse.success(tools.list());
    }

    /** Streams a cutter preview image from the configured local document directory. */
    @GetMapping(value = "/{model}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<Resource> image(@PathVariable String model) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.noCache())
                .body(tools.image(model));
    }
}
