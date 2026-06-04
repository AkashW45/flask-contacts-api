package io.spring.api.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ResourceNotFoundExceptionTests {

    private final ResourceNotFoundException controller = new ResourceNotFoundException();

    @Test
    void shouldReturn200OkWhenGetVersion() {
        ResponseEntity<Map<String, String>> response = controller.getVersion();
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void shouldReturnServiceNameFlaskContactsApi() {
        ResponseEntity<Map<String, String>> response = controller.getVersion();
        assertEquals("flask-contacts-api", response.getBody().get("service"));
    }

    @Test
    void shouldReturnCommitUnknownWhenGitCommitEnvNotSet() {
        // Assumes GIT_COMMIT environment variable is not set
        ResponseEntity<Map<String, String>> response = controller.getVersion();
        assertEquals("unknown", response.getBody().get("commit"));
    }

    @Test
    void shouldReturnTimestampInIso8601Format() {
        ResponseEntity<Map<String, String>> response = controller.getVersion();
        String timestamp = response.getBody().get("timestamp");
        assertNotNull(timestamp);
        assertDoesNotThrow(() -> Instant.parse(timestamp));
    }
}