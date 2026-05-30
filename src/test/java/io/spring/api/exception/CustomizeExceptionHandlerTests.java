package io.spring.api.exception;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.spring.api.exception.InvalidAuthenticationException;
import io.spring.api.exception.InvalidRequestException;

@WebMvcTest(controllers = CustomizeExceptionHandlerTests.TestController.class)
class CustomizeExceptionHandlerTests {

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class TestController {

        @GetMapping("/invalid-request")
        public void throwInvalidRequest() {
            List<FieldError> fieldErrors = new ArrayList<>();
            fieldErrors.add(new FieldError("obj1", "field1", "must not be null"));
            BindingResult bindingResult = mock(BindingResult.class);
            when(bindingResult.getFieldErrors()).thenReturn(fieldErrors);
            throw new InvalidRequestException(bindingResult);
        }

        @GetMapping("/invalid-request-empty")
        public void throwInvalidRequestEmpty() {
            BindingResult bindingResult = mock(BindingResult.class);
            when(bindingResult.getFieldErrors()).thenReturn(Collections.emptyList());
            throw new InvalidRequestException(bindingResult);
        }

        @GetMapping("/invalid-auth")
        public void throwInvalidAuthentication() {
            throw new InvalidAuthenticationException("auth failed");
        }

        @PostMapping("/method-arg-not-valid")
        public void postInvalidBody(@Valid @RequestBody TestDto dto) {
            // method never reached when validation fails
        }

        @GetMapping("/constraint-violation")
        public void throwConstraintViolation() {
            ConstraintViolation<?> violation = mock(ConstraintViolation.class);
            when(violation.getRootBeanClass()).thenReturn((Class) TestController.class);
            when(violation.getPropertyPath()).thenReturn(mock(javax.validation.Path.class));
            when(violation.getPropertyPath().toString()).thenReturn("addUser.arg0.name");
            when(violation.getConstraintDescriptor()).thenReturn(mock(javax.validation.metadata.ConstraintDescriptor.class));
            when(violation.getConstraintDescriptor().getAnnotation()).thenReturn(mock(java.lang.annotation.Annotation.class));
            when(violation.getConstraintDescriptor().getAnnotation().annotationType())
                    .thenReturn((Class) NotNull.class);
            when(violation.getMessage()).thenReturn("must not be null");
            Set<ConstraintViolation<?>> violations = new HashSet<>();
            violations.add(violation);
            throw new ConstraintViolationException("error", violations);
        }
    }

    static class TestDto {
        @NotNull
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    @Test
    void handleInvalidRequest_shouldReturn422WithFieldErrors() throws Exception {
        mockMvc.perform(get("/invalid-request"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].objectName").value("obj1"))
                .andExpect(jsonPath("$.errors[0].field").value("field1"))
                .andExpect(jsonPath("$.errors[0].message").value("must not be null"));
    }

    @Test
    void handleInvalidRequest_withNoFieldErrors_shouldReturn422WithEmptyErrors() throws Exception {
        mockMvc.perform(get("/invalid-request-empty"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.errors", hasSize(0)));
    }

    @Test
    void handleInvalidAuthentication_shouldReturn422WithMessage() throws Exception {
        mockMvc.perform(get("/invalid-auth"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("auth failed"));
    }

    @Test
    void handleMethodArgumentNotValid_shouldReturn422WithErrors() throws Exception {
        mockMvc.perform(post("/method-arg-not-valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": null}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));
    }

    @Test
    void handleConstraintViolation_shouldReturn422WithError() throws Exception {
        mockMvc.perform(get("/constraint-violation"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].objectName").value(
                        io.spring.api.exception.CustomizeExceptionHandlerTests.TestController.class.getName()))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"))
                .andExpect(jsonPath("$.errors[0].message").value("must not be null"));
    }
}