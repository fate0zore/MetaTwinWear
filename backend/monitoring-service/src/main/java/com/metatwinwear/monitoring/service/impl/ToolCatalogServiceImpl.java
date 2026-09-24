package com.metatwinwear.monitoring.service.impl;

import com.metatwinwear.common.exception.ApiException;
import com.metatwinwear.common.response.ApiStatus;
import com.metatwinwear.monitoring.mapper.ToolCatalogMapper;
import com.metatwinwear.monitoring.service.ToolCatalogService;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationOptions;
import com.metatwinwear.monitoring.model.dto.ApiModels.ConfigurationPayload;
import com.metatwinwear.monitoring.model.dto.ApiModels.ToolConfig;
import com.metatwinwear.monitoring.model.dto.ApiModels.WorkpieceConfig;
import com.metatwinwear.monitoring.model.dto.ToolCatalogItem;
import com.metatwinwear.monitoring.model.entity.ToolCatalogRecord;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriUtils;

/** Implements catalogue queries, API conversions, and safe image resolution. */
@Service
public class ToolCatalogServiceImpl implements ToolCatalogService {
    private static final List<String> WORKPIECE_SIZES =
            List.of("80 × 60 × 40", "120 × 80 × 50", "160 × 100 × 60");
    private static final List<String> WORKPIECE_MATERIALS = List.of(
            "镍基高温合金 (Inconel 718)", "钛合金 (TC4)", "铝合金 (7075)", "模具钢 (S136)");

    private final ToolCatalogMapper tools;
    private final Path imageRoot;

    /** Creates the catalogue service with an independently configurable image directory.
     *
     * @param tools tool catalogue mapper
     * @param imageRoot optional image directory setting
     */
    public ToolCatalogServiceImpl(ToolCatalogMapper tools,
                                  @Value("${metatwinwear.tool-catalog.image-root:}") String imageRoot) {
        this.tools = tools;
        this.imageRoot = resolveImageRoot(imageRoot);
    }

    /** Returns all catalogue items with same-origin image URLs for the dashboard.
     *
     * @return immutable catalogue item list
     */
    @Override
    public List<ToolCatalogItem> list() {
        return tools.selectCatalogue().stream().map(this::toItem).toList();
    }

    /** Builds the configuration-options contract from persisted tool records.
     *
     * @return immutable configuration options
     */
    @Override
    public ConfigurationOptions options() {
        List<ToolCatalogRecord> catalogue = tools.selectCatalogue();
        List<String> models = catalogue.stream().map(tool -> tool.model).toList();
        List<String> types = distinct(catalogue.stream().map(tool -> tool.type).toList());
        List<Integer> diameters = distinct(catalogue.stream().map(tool -> (int) tool.diameter).toList());
        List<Integer> lengths = distinct(catalogue.stream().map(tool -> (int) tool.length).toList());
        List<Integer> toothCounts = distinct(catalogue.stream().map(tool -> tool.toothCount).toList());
        List<String> materials = distinct(catalogue.stream().map(tool -> tool.material).toList());
        return new ConfigurationOptions(models, types, diameters, lengths, toothCounts, materials,
                WORKPIECE_SIZES, WORKPIECE_MATERIALS);
    }

    /** Returns the recommended default tool and the existing default workpiece.
     *
     * @return default tool and workpiece
     * @throws ApiException when the default tool is missing
     */
    @Override
    public ConfigurationPayload defaults() {
        ToolCatalogRecord tool = tools.selectById(DEFAULT_TOOL_MODEL);
        if (tool == null) {
            throw new ApiException(ApiStatus.INTERNAL_SERVER_ERROR, "默认刀具目录数据不存在");
        }
        return new ConfigurationPayload(toToolConfig(tool),
                new WorkpieceConfig("120 × 80 × 50", "镍基高温合金 (Inconel 718)"));
    }

    /** Resolves a catalogue image without allowing paths outside the configured document directory.
     *
     * @param model catalogue model identifier
     * @return local image resource
     * @throws ApiException when the model or image is unavailable
     */
    @Override
    public Resource image(String model) {
        ToolCatalogRecord tool = tools.selectById(model);
        if (tool == null) {
            throw new ApiException(ApiStatus.NOT_FOUND, "未找到该刀具型号");
        }
        Path image = imageRoot.resolve(tool.imagePath).normalize();
        if (!image.startsWith(imageRoot) || !Files.isRegularFile(image)) {
            throw new ApiException(ApiStatus.NOT_FOUND, "该型号的刀具图片暂不可用");
        }
        return new FileSystemResource(image);
    }

    /** Converts a persistence record into the stable API representation.
     *
     * @param tool catalogue persistence record
     * @return API catalogue item
     */
    private ToolCatalogItem toItem(ToolCatalogRecord tool) {
        String encodedModel = UriUtils.encodePathSegment(tool.model, StandardCharsets.UTF_8);
        return new ToolCatalogItem(tool.model, tool.type, tool.diameter, tool.length, tool.toothCount,
                tool.material, tool.description, "/api/v1/tools/" + encodedModel + "/image");
    }

    /** Converts a persistence record into the configuration contract.
     *
     * @param tool catalogue persistence record
     * @return configuration tool DTO
     */
    private ToolConfig toToolConfig(ToolCatalogRecord tool) {
        return new ToolConfig(tool.model, tool.type, tool.diameter, tool.length, tool.toothCount, tool.material);
    }

    /** Keeps first-seen catalogue order while removing duplicate option values.
     *
     * @param <T> option value type
     * @param values catalogue values
     * @return unique values in encounter order
     */
    private <T> List<T> distinct(List<T> values) {
        Set<T> unique = new LinkedHashSet<>(values);
        return List.copyOf(unique);
    }

    /** Finds the repository document directory when no deployment-specific path is configured.
     *
     * @param configuredRoot configured image directory
     * @return normalized absolute image directory
     */
    private Path resolveImageRoot(String configuredRoot) {
        if (configuredRoot != null && !configuredRoot.isBlank()) {
            return Path.of(configuredRoot).toAbsolutePath().normalize();
        }
        Path workingDirectory = Path.of("").toAbsolutePath().normalize();
        return List.of(workingDirectory.resolve("doc"), workingDirectory.resolve("../doc"),
                        workingDirectory.resolve("../../doc"))
                .stream()
                .map(Path::normalize)
                .filter(Files::isDirectory)
                .findFirst()
                .orElse(workingDirectory.resolve("../doc").normalize());
    }
}
