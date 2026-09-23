package com.metatwinwear.monitoring.controller;

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
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Converts API exceptions into the shared response body and matching HTTP status. */
@RestControllerAdvice(basePackages = "com.metatwinwear.monitoring")
public class ApiExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Handles Bean Validation errors on JSON request bodies. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> invalidRequestBody(MethodArgumentNotValidException error) {
        String message = error.getBindingResult().getFieldErrors().stream()
                .map(this::fieldErrorMessage)
                .distinct()
                .collect(Collectors.joining("；"));
        return response(ApiStatus.BAD_REQUEST, message.isBlank() ? "请求参数校验失败" : message);
    }

    /** Handles validation errors raised for controller method parameters. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>> invalidMethodParameters(HandlerMethodValidationException error) {
        return response(ApiStatus.BAD_REQUEST, "请求参数校验失败");
    }

    /** Handles parameter constraints raised outside request-body binding. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> constraintViolation(ConstraintViolationException error) {
        String message = error.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .distinct()
                .collect(Collectors.joining("；"));
        return response(ApiStatus.BAD_REQUEST, message.isBlank() ? "请求参数校验失败" : message);
    }

    /** Handles malformed or unreadable JSON request bodies. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> unreadableRequest(HttpMessageNotReadableException error) {
        return response(ApiStatus.BAD_REQUEST, "请求体格式错误");
    }

    /** Handles invalid path and query parameter types. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> invalidParameterType(MethodArgumentTypeMismatchException error) {
        return response(ApiStatus.BAD_REQUEST, "请求参数格式错误: " + error.getName());
    }

    /** Handles requests sent with an unsupported HTTP method. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> methodNotAllowed(HttpRequestMethodNotSupportedException error) {
        return response(ApiStatus.METHOD_NOT_ALLOWED);
    }

    /** Handles requests sent with an unsupported media type. */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> unsupportedMediaType(HttpMediaTypeNotSupportedException error) {
        return response(ApiStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /** Converts business argument validation failures into HTTP 400 responses. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> invalidConfiguration(IllegalArgumentException error) {
        return response(ApiStatus.BAD_REQUEST, safeMessage(error.getMessage(), ApiStatus.BAD_REQUEST));
    }

    /** Preserves a known response status and its safe reason message. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> responseStatus(ResponseStatusException error) {
        ApiStatus status = statusFor(error.getStatusCode());
        return response(status, safeMessage(error.getReason(), status));
    }

    /** Handles framework exceptions that carry an HTTP status. */
    @ExceptionHandler(ErrorResponseException.class)
    public ResponseEntity<ApiResponse<Void>> frameworkError(ErrorResponseException error) {
        return response(statusFor(error.getStatusCode()));
    }

    /** Handles missing static resources and unknown API paths. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> resourceNotFound(NoResourceFoundException error) {
        return response(ApiStatus.NOT_FOUND);
    }

    /** Logs unexpected failures and returns a fixed message without internal details. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected(Exception error) {
        LOGGER.error("Unhandled API exception", error);
        return response(ApiStatus.INTERNAL_SERVER_ERROR);
    }

    /** Formats one validation error without exposing implementation data. */
    private String fieldErrorMessage(FieldError error) {
        return error.getField() + ": " + safeMessage(error.getDefaultMessage(), ApiStatus.BAD_REQUEST);
    }

    /** Maps framework HTTP codes to the shared status catalog. */
    private ApiStatus statusFor(HttpStatusCode statusCode) {
        try {
            return ApiStatus.fromCode(statusCode.value());
        } catch (IllegalArgumentException ignored) {
            if (statusCode.is4xxClientError()) {
                return ApiStatus.BAD_REQUEST;
            }
            return ApiStatus.INTERNAL_SERVER_ERROR;
        }
    }

    /** Uses a status default whenever an exception has no safe message. */
    private String safeMessage(String message, ApiStatus status) {
        return message == null || message.isBlank() ? status.getMessage() : message;
    }

    /** Builds an error body with its matching HTTP status. */
    private ResponseEntity<ApiResponse<Void>> response(ApiStatus status) {
        return response(status, status.getMessage());
    }

    /** Builds an error body with its matching HTTP status and message. */
    private ResponseEntity<ApiResponse<Void>> response(ApiStatus status, String message) {
        return ResponseEntity.status(status.getCode()).body(ApiResponse.failure(status, message));
    }
}
