package com.metatwinwear.common.exception;

import com.metatwinwear.common.response.ApiStatus;

/** Represents an expected application failure with a stable API status. */
public class ApiException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final ApiStatus status;

    /** Creates an application exception with a status-specific default message.
     *
     * @param status API error status
     */
    public ApiException(ApiStatus status) {
        this(status, status.getMessage());
    }

    /** Creates an application exception with an explicit client-safe message.
     *
     * @param status API error status
     * @param message client-safe error message
     */
    public ApiException(ApiStatus status, String message) {
        super(message);
        if (status == null || status.isSuccess()) {
            throw new IllegalArgumentException("业务异常必须使用失败状态");
        }
        this.status = status;
    }

    /** Returns the API status associated with this failure.
     *
     * @return API error status
     */
    public ApiStatus getStatus() {
        return status;
    }
}
