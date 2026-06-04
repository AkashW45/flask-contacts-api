<<<<<<< HEAD
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
import java.util.Map;
import java.util.HashMap;
import java.time.Instant;
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
            @Test
    void versionEndpoint_returns200WithCorrectFields() throws Exception {
        mockMvc.perform(get("/version"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.service").isString())
                .andExpect(jsonPath("$.commit").isString())
                .andExpect(jsonPath("$.timestamp").isString());
    }
}

        @GetMapping("/version")
        public Map<String, Object> version() {
            Map<String, Object> result = new HashMap<>();
            result.put("service", "flask-contacts-api");
            String commit = System.getenv("GIT_COMMIT");
            result.put("commit", commit != null ? commit : "unknown");
            result.put("timestamp", Instant.now().toString());
            return result;
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
=======
package de.spring.api.exception;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import javax.validation.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.WebRequest;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import io.spring.api.exception.CustomizeExceptionHandler;
import io.spring.api.exception.FieldErrorResource;
import io.spring.api.exception.InvalidAuthenticationException;
import io.spring.api.exception.InvalidRequestException;
import io.spring.api.exception.ErrorResource;

public class CustomizeExceptionHandlerTests {

    private CustomizeExceptionHandler handler;
    private CustomizeExceptionHandler.LoggingFilter filter;
    private HttpServletRequest mockRequest;
    private HttpServletResponse mockResponse;
    private FilterChain mockChain;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        handler = new CustomizeExceptionHandler();
        filter = new CustomizeExceptionHandler.LoggingFilter();

        mockRequest = mock(HttpServletRequest.class);
        mockResponse = mock(HttpServletResponse.class);
        mockChain = mock(FilterChain.class);

        Logger logger = (Logger) org.slf4j.LoggerFactory.getLogger(CustomizeExceptionHandler.LoggingFilter.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        logger.addAppender(listAppender);
    }

    @Test
    void shouldLogRequestInfoWhenFilterSuccess() throws IOException, ServletException {
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockRequest.getRequestURI()).thenReturn("/test");
        when(mockResponse.getStatus()).thenReturn(200);

        filter.doFilter(mockRequest, mockResponse, mockChain);

        verify(mockChain).doFilter(mockRequest, mockResponse);

        List<ILoggingEvent> logs = listAppender.list;
        assertThat(logs).hasSize(1);
        ILoggingEvent event = logs.get(0);
        assertThat(event.getFormattedMessage()).matches("GET /test 200 \\d+ms");
    }

    @Test
    void shouldNotLogAndPropagateExceptionWhenChainThrows() throws IOException, ServletException {
        ServletException expectedException = new ServletException("chain failure");
        doThrow(expectedException).when(mockChain).doFilter(mockRequest, mockResponse);

        assertThatThrownBy(() -> filter.doFilter(mockRequest, mockResponse, mockChain))
                .isEqualTo(expectedException);

        assertThat(listAppender.list).isEmpty();
    }

    @Test
    void shouldDoNothingOnInitAndDestroy() throws ServletException {
        FilterConfig mockConfig = mock(FilterConfig.class);
        filter.init(mockConfig);
        filter.destroy();
        assertThatCode(() -> {}).doesNotThrowAnyException(); // just ensure no exceptions
    }

    @Test
    void handleInvalidRequest_shouldReturn422AndErrorResource() {
        InvalidRequestException ex = mock(InvalidRequestException.class);
        InvalidRequestException.Errors errors = mock(InvalidRequestException.Errors.class);
        FieldError fieldError = new FieldError("object", "field", "defaultMessage");
        List<FieldError> fieldErrors = List.of(fieldError);
        when(ex.getErrors()).thenReturn(errors);
        when(errors.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<Object> response = handler.handleInvalidRequest(ex, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(ErrorResource.class);
        ErrorResource error = (ErrorResource) response.getBody();
        assertThat(error.getErrors()).hasSize(1);
        assertThat(error.getErrors().get(0).getField()).isEqualTo("field");
    }

    @Test
    void handleConstraintViolation_shouldReturn422AndErrorResource() {
        ConstraintViolationException ex = mock(ConstraintViolationException.class);
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Set<ConstraintViolation<?>> violations = new HashSet<>();
        violations.add(violation);
        when(ex.getConstraintViolations()).thenReturn(violations);

        Path path = mock(Path.class);
        when(path.toString()).thenReturn("create.user.name"); // needs at least two parts
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getRootBeanClass()).thenReturn((Class) io.spring.api.exception.CustomizeExceptionHandler.class);
        when(violation.getConstraintDescriptor()).thenReturn(mock(javax.validation.metadata.ConstraintDescriptor.class));
        when(violation.getMessage()).thenReturn("must not be blank");
        when(violation.getConstraintDescriptor().getAnnotation()).thenReturn(mock(java.lang.annotation.Annotation.class));
        when(violation.getConstraintDescriptor().getAnnotation().annotationType()).thenReturn(javax.validation.constraints.NotNull.class);

        ErrorResource result = handler.handleConstraintViolation(ex, mock(WebRequest.class));

        assertThat(result.getErrors()).hasSize(1);
        FieldErrorResource fieldError = result.getErrors().get(0);
        assertThat(fieldError.getField()).isEqualTo("name");
        assertThat(fieldError.getCode()).isEqualTo("NotNull");
        assertThat(fieldError.getDefaultMessage()).isEqualTo("must not be blank");
>>>>>>> 1e333c64a3b19bbda9e042cd4c8ff636d0fbef63
    }
}