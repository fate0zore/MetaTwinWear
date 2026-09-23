package com.metatwinwear.monitoring.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.common.response.ApiStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/** Normalizes API errors generated before Spring selects a controller. */
@Component
public class ApiErrorResponseFilter extends OncePerRequestFilter {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiErrorResponseFilter.class);
    private static final String API_PREFIX = "/api/v1/";
    private static final String EVENTS_PATH = "/api/v1/monitoring/events";

    private final ObjectMapper objectMapper;

    /** Creates the filter with the application's JSON serializer. */
    public ApiErrorResponseFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Buffers API responses so unhandled 4xx and 5xx responses can use the shared envelope. */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!(path.equals("/api/v1") || path.startsWith(API_PREFIX)) || EVENTS_PATH.equals(path)) {
            chain.doFilter(request, response);
            return;
        }

        ApiContentCachingResponseWrapper wrapped = new ApiContentCachingResponseWrapper(response);
        try {
            chain.doFilter(request, wrapped);
        } catch (Exception error) {
            LOGGER.error("Unhandled API filter-chain exception", error);
            wrapped.resetBuffer();
            writeError(wrapped, ApiStatus.INTERNAL_SERVER_ERROR);
        }

        int responseCode = wrapped.getStatus();
        if (responseCode >= 400 && !isUnifiedError(wrapped.getContentAsByteArray())) {
            writeError(wrapped, statusFor(responseCode));
        }
        wrapped.copyBodyToResponse();
    }

    /** Leaves an existing standard envelope intact. */
    private boolean isUnifiedError(byte[] body) {
        if (body.length == 0) {
            return false;
        }
        try {
            JsonNode json = objectMapper.readTree(body);
            return json != null && json.isObject()
                    && json.has("code") && json.has("message")
                    && json.has("success") && json.has("data");
        } catch (IOException ignored) {
            return false;
        }
    }

    /** Maps a servlet status to a supported shared status. */
    private ApiStatus statusFor(int code) {
        try {
            return ApiStatus.fromCode(code);
        } catch (IllegalArgumentException ignored) {
            HttpStatusCode statusCode = HttpStatusCode.valueOf(code);
            return statusCode.is4xxClientError() ? ApiStatus.BAD_REQUEST : ApiStatus.INTERNAL_SERVER_ERROR;
        }
    }

    /** Replaces a framework error body with a status-matched JSON envelope. */
    private void writeError(HttpServletResponse response, ApiStatus status) throws IOException {
        byte[] body = objectMapper.writeValueAsBytes(ApiResponse.failure(status));
        response.resetBuffer();
        response.setStatus(status.getCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
    }

    private static final class ApiContentCachingResponseWrapper extends ContentCachingResponseWrapper {
        private ApiContentCachingResponseWrapper(HttpServletResponse response) {
            super(response);
        }

        @Override
        public void sendError(int status) throws IOException {
            setStatus(status);
        }

        @Override
        public void sendError(int status, String message) throws IOException {
            setStatus(status);
        }
    }
}
