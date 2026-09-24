package com.metatwinwear.gateway;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metatwinwear.common.response.ApiResponse;
import com.metatwinwear.common.response.ApiStatus;
import java.net.ConnectException;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponse;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

/** Converts gateway failures under the business API prefix into the shared JSON envelope. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiGatewayExceptionHandler implements WebExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiGatewayExceptionHandler.class);
    private static final String API_PREFIX = "/api/v1/";

    private final ObjectMapper objectMapper;

    /** Creates the handler with the application's JSON serializer.
     *
     * @param objectMapper configured JSON serializer
     */
    public ApiGatewayExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Wraps errors under the business API prefix and leaves infrastructure errors untouched.
     *
     * @param exchange current gateway exchange
     * @param error failure raised while processing the request
     * @return reactive completion of the error response
     */
    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable error) {
        String path = exchange.getRequest().getPath().value();
        if (!("/api/v1".equals(path) || path.startsWith(API_PREFIX)) || exchange.getResponse().isCommitted()) {
            return Mono.error(error);
        }

        ApiStatus status = statusFor(error);
        String message = messageFor(error, status);
        exchange.getResponse().setStatusCode(HttpStatusCode.valueOf(status.getCode()));
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            byte[] body = objectMapper.writeValueAsBytes(ApiResponse.failure(status, message));
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
        } catch (JsonProcessingException serializationError) {
            LOGGER.error("Unable to serialize gateway error response", serializationError);
            exchange.getResponse().setStatusCode(HttpStatusCode.valueOf(ApiStatus.INTERNAL_SERVER_ERROR.getCode()));
            return exchange.getResponse().setComplete();
        }
    }

    /** Derives a safe status from known HTTP and network failures.
     *
     * @param error failure raised while processing the request
     * @return matching shared API status
     */
    private ApiStatus statusFor(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof ResponseStatusException responseStatus) {
                return mapStatus(responseStatus.getStatusCode());
            }
            if (cause instanceof ErrorResponse frameworkError) {
                return mapStatus(frameworkError.getStatusCode());
            }
            if (cause instanceof ConnectException || cause instanceof TimeoutException) {
                return ApiStatus.SERVICE_UNAVAILABLE;
            }
        }
        return ApiStatus.SERVICE_UNAVAILABLE;
    }

    /** Restricts response status codes to those represented by the shared enum.
     *
     * @param statusCode original HTTP status
     * @return matching or fallback API status
     */
    private ApiStatus mapStatus(HttpStatusCode statusCode) {
        return ApiStatus.findByCode(statusCode.value())
                .orElseGet(() -> statusCode.is4xxClientError()
                        ? ApiStatus.BAD_REQUEST
                        : ApiStatus.INTERNAL_SERVER_ERROR);
    }

    /** Exposes client-safe reasons and hides internal server failure details.
     *
     * @param error failure raised while processing the request
     * @param status mapped API status
     * @return safe response message
     */
    private String messageFor(Throwable error, ApiStatus status) {
        if (error instanceof ResponseStatusException responseStatus
                && status.getCode() < 500 && responseStatus.getReason() != null
                && !responseStatus.getReason().isBlank()) {
            return responseStatus.getReason();
        }
        if (status.getCode() >= 500) {
            LOGGER.error("Gateway request failed", error);
        }
        return status.getMessage();
    }
}
