package io.spring.api.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.ResponseStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ResourceNotFoundExceptionTests {

    @Test
    void shouldBeAnnotatedWithNotFoundStatus() {
        ResponseStatus annotation = ResourceNotFoundException.class.getAnnotation(ResponseStatus.class);
        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void shouldExtendRuntimeException() {
        assertThat(RuntimeException.class.isAssignableFrom(ResourceNotFoundException.class)).isTrue();
    }

    @Nested
    @WebMvcTest(PingController.class)
    class PingControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void pingEndpoint_shouldReturnPongWith200AndPlainText() throws Exception {
            mockMvc.perform(get("/ping"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("pong"))
                    .andExpect(header().string("Content-Type", "text/plain;charset=UTF-8"));
        }

        @Test
        void pingEndpoint_withJsonAcceptHeader_shouldStillReturnPlainText() throws Exception {
            mockMvc.perform(get("/ping").accept("application/json"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("pong"))
                    .andExpect(header().string("Content-Type", "text/plain;charset=UTF-8"));
        }

        @Test
        void getRootPath_shouldReturn404NotFound() throws Exception {
            mockMvc.perform(get("/"))
                    .andExpect(status().isNotFound());
        }

        @Test
        void postPingEndpoint_shouldReturn405MethodNotAllowed() throws Exception {
            mockMvc.perform(post("/ping"))
                    .andExpect(status().isMethodNotAllowed());
        }
    }
}