package com.metatwinwear.monitoring.filter;

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

    /** Creates the filter with the application's JSON serializer.
     *
     * @param objectMapper configured JSON serializer
     */
    public ApiErrorResponseFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Buffers API responses so unhandled 4xx and 5xx responses can use the shared envelope.
     *
     * @param request current servlet request
     * @param response current servlet response
     * @param chain remaining filter chain
     * @throws ServletException when servlet processing fails
     * @throws IOException when request or response processing fails
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!("/api/v1".equals(path) || path.startsWith(API_PREFIX)) || EVENTS_PATH.equals(path)) {
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

    /** Leaves an existing standard envelope intact.
     *
     * @param body cached response body
     * @return {@code true} when the body already has the shared envelope shape
     */
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

    /** Maps a servlet status to a supported shared status.
     *
     * @param code servlet response status code
     * @return matching or fallback API status
     */
    private ApiStatus statusFor(int code) {
        return ApiStatus.findByCode(code)
                .orElseGet(() -> {
                    HttpStatusCode statusCode = HttpStatusCode.valueOf(code);
                    return statusCode.is4xxClientError()
                            ? ApiStatus.BAD_REQUEST
                            : ApiStatus.INTERNAL_SERVER_ERROR;
                });
    }

    /** Replaces a framework error body with a status-matched JSON envelope.
     *
     * @param response servlet response to update
     * @param status shared API status
     * @throws IOException when the response body cannot be written
     */
    private void writeError(HttpServletResponse response, ApiStatus status) throws IOException {
        byte[] body = objectMapper.writeValueAsBytes(ApiResponse.failure(status));
        response.resetBuffer();
        response.setStatus(status.getCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
    }

    /** Preserves send-error statuses so the filter can write the shared body. */
    private static final class ApiContentCachingResponseWrapper extends ContentCachingResponseWrapper {

        /** Creates a wrapper around the servlet response.
         *
         * @param response servlet response to wrap
         */
        private ApiContentCachingResponseWrapper(HttpServletResponse response) {
            super(response);
        }

        /** Stores the status instead of committing the default container body.
         *
         * @param status HTTP response status
         * @throws IOException retained for the servlet API signature
         */
        @Override
        public void sendError(int status) throws IOException {
            setStatus(status);
        }

        /** Stores the status instead of committing the default container body.
         *
         * @param status HTTP response status
         * @param message container error message, intentionally not returned to clients
         * @throws IOException retained for the servlet API signature
         */
        @Override
        public void sendError(int status, String message) throws IOException {
            setStatus(status);
        }
    }
}
