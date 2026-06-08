package io.spring.api.exception;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ResourceNotFoundException.class)
class ResourceNotFoundExceptionTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void pingReturnsPong() throws Exception {
        mockMvc.perform(get("/ping"))
                .andExpect(status().isOk())
                .andExpect(content().string("pong"))
                .andExpect(content().contentType("text/plain;charset=UTF-8"));
    }

    @Test
    void postToPingShouldBeMethodNotAllowed() throws Exception {
        mockMvc.perform(post("/ping"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void requestToOtherPathShouldReturnNotFound() throws Exception {
        mockMvc.perform(get("/other"))
                .andExpect(status().isNotFound());
    }
}