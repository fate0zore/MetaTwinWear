package com.metatwinwear.common.response;

/** Standard JSON envelope for successful and failed HTTP API responses. */
public final class ApiResponse<T> {
    private final int code;
    private final String message;
    private final boolean success;
    private final T data;

    private ApiResponse(int code, String message, boolean success, T data) {
        this.code = code;
        this.message = message;
        this.success = success;
        this.data = data;
    }

    /** Creates a successful response with no payload.
     *
     * @return success response with an empty payload
     */
    public static ApiResponse<Void> success() {
        return success("请求成功", null);
    }

    /** Creates a successful response with the default message.
     *
     * @param <T> payload type
     * @param data response payload
     * @return success response
     */
    public static <T> ApiResponse<T> success(T data) {
        return success("请求成功", data);
    }

    /** Creates a successful response with an explicit message and payload.
     *
     * @param <T> payload type
     * @param message response message
     * @param data response payload
     * @return success response
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(ApiStatus.SUCCESS.getCode(), message, true, data);
    }

    /** Creates a failed response with the status default message.
     *
     * @param <T> payload type
     * @param status response status
     * @return failure response with a null payload
     */
    public static <T> ApiResponse<T> failure(ApiStatus status) {
        return failure(status, status.getMessage());
    }

    /** Creates a failed response with a safe, explicit message.
     *
     * @param <T> payload type
     * @param status response status
     * @param message safe response message
     * @return failure response with a null payload
     * @throws IllegalArgumentException when a success status is supplied
     */
    public static <T> ApiResponse<T> failure(ApiStatus status, String message) {
        if (status.isSuccess()) {
            throw new IllegalArgumentException("失败响应不能使用成功状态: " + status);
        }
        return new ApiResponse<>(status.getCode(), message, false, null);
    }

    /** Returns the HTTP status code repeated in the response body.
     *
     * @return HTTP status code
     */
    public int getCode() {
        return code;
    }

    /** Returns the human-readable response message.
     *
     * @return response message
     */
    public String getMessage() {
        return message;
    }

    /** Indicates whether the request succeeded.
     *
     * @return {@code true} when the response represents success
     */
    public boolean isSuccess() {
        return success;
    }

    /** Returns the business payload, or {@code null} for failures.
     *
     * @return response payload
     */
    public T getData() {
        return data;
    }
}
