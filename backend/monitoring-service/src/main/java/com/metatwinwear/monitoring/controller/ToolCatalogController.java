package com.metatwinwear.monitoring.controller;

import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.monitoring.model.dto.ToolCatalogItem;
import com.metatwinwear.monitoring.service.ToolCatalogService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes catalogue records and preview images through the API. */
@Validated
@RestController
@RequestMapping("/api/v1/tools")
public class ToolCatalogController {
    private final ToolCatalogService tools;

    /** Creates the controller with its catalogue service.
     *
     * @param tools tool catalogue service
     */
    public ToolCatalogController(ToolCatalogService tools) {
        this.tools = tools;
    }

    /** Lists cutter records and their same-origin preview URLs.
     *
     * @return wrapped catalogue list
     */
    @GetMapping
    public ApiResponse<List<ToolCatalogItem>> list() {
        return ApiResponse.success(tools.list());
    }

    /** Streams a cutter preview image from the configured document directory.
     *
     * @param model validated catalogue model identifier
     * @return JPEG image response
     */
    @GetMapping(value = "/{model}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<Resource> image(@PathVariable @NotBlank @Size(max = 128) String model) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.noCache())
                .body(tools.image(model));
    }
}
