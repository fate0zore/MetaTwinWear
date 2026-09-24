package com.metatwinwear.common.response;

import java.util.Arrays;
import java.util.Optional;

/** HTTP status codes and default messages used by API responses. */
public enum ApiStatus {
    SUCCESS(200, "请求成功", true),
    BAD_REQUEST(400, "请求参数错误", false),
    UNAUTHORIZED(401, "未授权", false),
    FORBIDDEN(403, "禁止访问", false),
    NOT_FOUND(404, "请求的资源不存在", false),
    METHOD_NOT_ALLOWED(405, "不支持的请求方法", false),
    NOT_ACCEPTABLE(406, "请求的响应格式不可用", false),
    REQUEST_TIMEOUT(408, "请求超时", false),
    CONFLICT(409, "请求与当前资源状态冲突", false),
    PAYLOAD_TOO_LARGE(413, "请求内容过大", false),
    UNSUPPORTED_MEDIA_TYPE(415, "不支持的媒体类型", false),
    UNPROCESSABLE_ENTITY(422, "请求内容无法处理", false),
    TOO_MANY_REQUESTS(429, "请求过于频繁", false),
    INTERNAL_SERVER_ERROR(500, "服务器内部错误", false),
    BAD_GATEWAY(502, "上游服务响应异常", false),
    SERVICE_UNAVAILABLE(503, "服务暂不可用", false),
    GATEWAY_TIMEOUT(504, "上游服务响应超时", false);

    private final int code;
    private final String message;
    private final boolean success;

    /** Creates one shared API status definition.
     *
     * @param code HTTP response code
     * @param message default safe response message
     * @param success whether the status represents success
     */
    ApiStatus(int code, String message, boolean success) {
        this.code = code;
        this.message = message;
        this.success = success;
    }

    /** Returns the matching status or rejects unsupported status codes explicitly.
     *
     * @param code HTTP response code
     * @return matching status definition
     * @throws IllegalArgumentException when the code is not defined
     */
    public static ApiStatus fromCode(int code) {
        return findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("未定义的 API 状态码: " + code));
    }

    /** Finds a status without throwing when the code is not in the shared catalog.
     *
     * @param code HTTP response code
     * @return matching status, or empty when it is not defined
     */
    public static Optional<ApiStatus> findByCode(int code) {
        return Arrays.stream(values())
                .filter(status -> status.code == code)
                .findFirst();
    }

    /** Returns the HTTP response status code.
     *
     * @return HTTP response code
     */
    public int getCode() {
        return code;
    }

    /** Returns the default safe message for this status.
     *
     * @return default response message
     */
    public String getMessage() {
        return message;
    }

    /** Indicates whether this is the successful HTTP status.
     *
     * @return {@code true} when this status represents success
     */
    public boolean isSuccess() {
        return success;
    }
}
