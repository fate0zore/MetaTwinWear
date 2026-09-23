package com.metatwinwear.common.response;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ApiResponseTest {
    @Test
    void createsSuccessfulResponsesWithAndWithoutPayload() {
        ApiResponse<Void> empty = ApiResponse.success();
        assertEquals(200, empty.getCode());
        assertEquals("请求成功", empty.getMessage());
        assertTrue(empty.isSuccess());
        assertNull(empty.getData());

        ApiResponse<String> defaultMessage = ApiResponse.success("payload");
        assertEquals("请求成功", defaultMessage.getMessage());
        assertEquals("payload", defaultMessage.getData());

        ApiResponse<Integer> customMessage = ApiResponse.success("created", 7);
        assertEquals("created", customMessage.getMessage());
        assertEquals(7, customMessage.getData());
    }

    @Test
    void createsFailuresWithStatusAndNoPayload() {
        ApiResponse<Void> defaultMessage = ApiResponse.failure(ApiStatus.NOT_FOUND);
        assertEquals(404, defaultMessage.getCode());
        assertEquals(ApiStatus.NOT_FOUND.getMessage(), defaultMessage.getMessage());
        assertFalse(defaultMessage.isSuccess());
        assertNull(defaultMessage.getData());

        ApiResponse<Void> customMessage = ApiResponse.failure(ApiStatus.BAD_REQUEST, "具体原因");
        assertEquals(400, customMessage.getCode());
        assertEquals("具体原因", customMessage.getMessage());
        assertFalse(customMessage.isSuccess());
        assertNull(customMessage.getData());
    }

    @Test
    void mapsKnownStatusesAndRejectsUnknownCodes() {
        assertEquals(ApiStatus.SUCCESS, ApiStatus.fromCode(200));
        assertEquals(ApiStatus.SERVICE_UNAVAILABLE, ApiStatus.fromCode(503));
        assertThrows(IllegalArgumentException.class, () -> ApiStatus.fromCode(418));
        assertThrows(IllegalArgumentException.class, () -> ApiResponse.failure(ApiStatus.SUCCESS));
    }
}
