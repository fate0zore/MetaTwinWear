package com.metatwinwear.gateway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.ConnectException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ResponseStatusException;

class ApiGatewayExceptionHandlerTest {
    private final ApiGatewayExceptionHandler handler = new ApiGatewayExceptionHandler(new ObjectMapper());

    @Test
    void wrapsUpstreamUnavailableErrorsWithoutLeakingInternalDetails() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/monitoring/snapshot").build());

        handler.handle(exchange, new ConnectException("private endpoint details")).block();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exchange.getResponse().getStatusCode());
        String body = exchange.getResponse().getBodyAsString().block();
        assertTrue(body.contains("\"code\":503"));
        assertTrue(body.contains("\"success\":false"));
        assertTrue(body.contains("服务暂不可用"));
        assertFalse(body.contains("private endpoint details"));
    }

    @Test
    void preservesKnownClientStatusAndMessage() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/tools/missing/image").build());

        handler.handle(exchange, new ResponseStatusException(HttpStatus.NOT_FOUND, "刀具不存在")).block();

        assertEquals(HttpStatus.NOT_FOUND, exchange.getResponse().getStatusCode());
        String body = exchange.getResponse().getBodyAsString().block();
        assertTrue(body.contains("\"code\":404"));
        assertTrue(body.contains("刀具不存在"));
    }

    @Test
    void leavesInfrastructurePathsToTheDefaultHandler() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/actuator/health").build());
        RuntimeException original = new RuntimeException("not an API request");

        RuntimeException propagated = assertThrows(RuntimeException.class,
                () -> handler.handle(exchange, original).block());

        assertEquals(original, propagated);
    }
}
