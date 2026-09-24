package com.metatwinwear.monitoring.config.exception;

import com.metatwinwear.common.exception.ApiException;
import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.common.response.ApiStatus;
import jakarta.validation.ConstraintViolationException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Converts API exceptions into the shared response body and matching HTTP status. */
@RestControllerAdvice(basePackages = "com.metatwinwear.monitoring")
public class ApiExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Handles Bean Validation errors on JSON request bodies.
     *
     * @param error binding and validation details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> invalidRequestBody(MethodArgumentNotValidException error) {
        String message = error.getBindingResult().getFieldErrors().stream()
                .map(this::fieldErrorMessage)
                .distinct()
                .collect(Collectors.joining("；"));
        return response(ApiStatus.BAD_REQUEST, message.isBlank() ? "请求参数校验失败" : message);
    }

    /** Handles validation errors raised for controller method parameters.
     *
     * @param error method validation details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>> invalidMethodParameters(HandlerMethodValidationException error) {
        return response(ApiStatus.BAD_REQUEST, "请求参数校验失败");
    }

    /** Handles parameter constraints raised outside request-body binding.
     *
     * @param error constraint validation details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> constraintViolation(ConstraintViolationException error) {
        String message = error.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .distinct()
                .collect(Collectors.joining("；"));
        return response(ApiStatus.BAD_REQUEST, message.isBlank() ? "请求参数校验失败" : message);
    }

    /** Handles malformed or unreadable JSON request bodies.
     *
     * @param error unreadable request details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> unreadableRequest(HttpMessageNotReadableException error) {
        return response(ApiStatus.BAD_REQUEST, "请求体格式错误");
    }

    /** Handles invalid path and query parameter types.
     *
     * @param error parameter conversion details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> invalidParameterType(MethodArgumentTypeMismatchException error) {
        return response(ApiStatus.BAD_REQUEST, "请求参数格式错误: " + error.getName());
    }

    /** Handles requests sent with an unsupported HTTP method.
     *
     * @param error method mismatch details
     * @return wrapped HTTP 405 response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> methodNotAllowed(HttpRequestMethodNotSupportedException error) {
        return response(ApiStatus.METHOD_NOT_ALLOWED);
    }

    /** Handles requests sent with an unsupported media type.
     *
     * @param error media type mismatch details
     * @return wrapped HTTP 415 response
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> unsupportedMediaType(HttpMediaTypeNotSupportedException error) {
        return response(ApiStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /** Converts business argument validation failures into HTTP 400 responses.
     *
     * @param error rejected argument details
     * @return wrapped HTTP 400 response
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> invalidConfiguration(IllegalArgumentException error) {
        return response(ApiStatus.BAD_REQUEST, safeMessage(error.getMessage(), ApiStatus.BAD_REQUEST));
    }

    /** Converts application failures to their declared API status and a safe message.
     *
     * @param error application failure
     * @return wrapped error response
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> applicationFailure(ApiException error) {
        ApiStatus status = error.getStatus();
        if (status.getCode() >= 500) {
            LOGGER.error("Application request failed with status {}", status.getCode(), error);
            return response(status);
        }
        return response(status, safeMessage(error.getMessage(), status));
    }

    /** Preserves a known response status and its safe reason message.
     *
     * @param error response status failure
     * @return wrapped error response
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> responseStatus(ResponseStatusException error) {
        ApiStatus status = statusFor(error.getStatusCode());
        return response(status, safeMessage(error.getReason(), status));
    }

    /** Handles framework exceptions that carry an HTTP status.
     *
     * @param error framework response failure
     * @return wrapped error response
     */
    @ExceptionHandler(ErrorResponseException.class)
    public ResponseEntity<ApiResponse<Void>> frameworkError(ErrorResponseException error) {
        return response(statusFor(error.getStatusCode()));
    }

    /** Handles missing static resources and unknown API paths.
     *
     * @param error missing resource details
     * @return wrapped HTTP 404 response
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> resourceNotFound(NoResourceFoundException error) {
        return response(ApiStatus.NOT_FOUND);
    }

    /** Ignores clients that disconnect while an asynchronous response is in progress.
     *
     * @param error asynchronous response failure caused by a disconnected client
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void clientDisconnected(AsyncRequestNotUsableException error) {
        LOGGER.debug("Client disconnected during an asynchronous response");
    }

    /** Logs unexpected failures and returns a fixed message without internal details.
     *
     * @param error unexpected server failure
     * @return wrapped HTTP 500 response
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected(Exception error) {
        LOGGER.error("Unhandled API exception", error);
        return response(ApiStatus.INTERNAL_SERVER_ERROR);
    }

    /** Formats one validation error without exposing implementation data.
     *
     * @param error validation field error
     * @return safe field-specific message
     */
    private String fieldErrorMessage(FieldError error) {
        return error.getField() + ": " + safeMessage(error.getDefaultMessage(), ApiStatus.BAD_REQUEST);
    }

    /** Maps framework HTTP codes to the shared status catalog.
     *
     * @param statusCode framework HTTP status
     * @return shared API status
     */
    private ApiStatus statusFor(HttpStatusCode statusCode) {
        return ApiStatus.findByCode(statusCode.value())
                .orElseGet(() -> statusCode.is4xxClientError()
                        ? ApiStatus.BAD_REQUEST
                        : ApiStatus.INTERNAL_SERVER_ERROR);
    }

    /** Uses a status default whenever an exception has no safe message.
     *
     * @param message candidate message
     * @param status response status
     * @return safe response message
     */
    private String safeMessage(String message, ApiStatus status) {
        return message == null || message.isBlank() ? status.getMessage() : message;
    }

    /** Builds an error body with its matching HTTP status.
     *
     * @param status shared API status
     * @return wrapped error response
     */
    private ResponseEntity<ApiResponse<Void>> response(ApiStatus status) {
        return response(status, status.getMessage());
    }

    /** Builds an error body with its matching HTTP status and message.
     *
     * @param status shared API status
     * @param message safe response message
     * @return wrapped error response
     */
    private ResponseEntity<ApiResponse<Void>> response(ApiStatus status, String message) {
        return ResponseEntity.status(status.getCode()).body(ApiResponse.failure(status, message));
    }
}
