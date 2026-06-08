package io.spring.api.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.Set;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import javax.validation.Path;
import javax.validation.metadata.ConstraintDescriptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.Errors;
import org.springframework.validation.FieldError;
import org.springframework.web.context.request.WebRequest;

@ExtendWith(MockitoExtension.class)
class CustomizeExceptionHandlerTests {

    private MockMvc mockMvc;
    private CustomizeExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new CustomizeExceptionHandler();
        mockMvc = MockMvcBuilders.standaloneSetup(handler).build();
    }

    @Test
    void pingShouldReturnPongWithTextPlain() throws Exception {
        mockMvc.perform(get("/ping"))
                .andExpect(status().isOk())
                .andExpect(content().string("pong"))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE));
    }

    @Test
    void handleInvalidRequestShouldReturnUnprocessableEntityWithErrors() {
        InvalidRequestException exception = mock(InvalidRequestException.class);
        Errors errors = mock(Errors.class);
        FieldError fieldError = new FieldError("object", "field", "rejected", false, null, null, "default message");
        when(errors.getFieldErrors()).thenReturn(Collections.singletonList(fieldError));
        when(exception.getErrors()).thenReturn(errors);

        ResponseEntity<Object> response = handler.handleInvalidRequest(exception, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(ErrorResource.class);
        ErrorResource errorResource = (ErrorResource) response.getBody();
        assertThat(errorResource.getErrors()).hasSize(1);
        FieldErrorResource fer = errorResource.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo("object");
        assertThat(fer.getField()).isEqualTo("field");
        assertThat(fer.getCode()).isEqualTo("rejected");
        assertThat(fer.getMessage()).isEqualTo("default message");
    }

    @Test
    void handleInvalidAuthenticationShouldReturnUnprocessableEntityWithMessage() {
        InvalidAuthenticationException exception = new InvalidAuthenticationException("auth error");
        ResponseEntity<Object> response = handler.handleInvalidAuthentication(exception, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(java.util.Map.class);
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertThat(body).containsEntry("message", "auth error");
    }

    @Test
    void handleConstraintViolationShouldReturnUnprocessableEntityWithErrors() {
        ConstraintViolationException exception = mock(ConstraintViolationException.class);
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        ConstraintDescriptor<?> descriptor = mock(ConstraintDescriptor.class);
        java.lang.annotation.Annotation annotation = mock(java.lang.annotation.Annotation.class);

        when(exception.getConstraintViolations()).thenReturn(Collections.singleton(violation));
        when(violation.getRootBeanClass()).thenAnswer(inv -> Object.class);
        when(violation.getPropertyPath()).thenReturn(path);
        when(path.toString()).thenReturn("property");
        when(violation.getConstraintDescriptor()).thenReturn(descriptor);
        when(descriptor.getAnnotation()).thenReturn(annotation);
        when(annotation.annotationType()).thenAnswer(inv -> (Class) javax.validation.constraints.NotNull.class);
        when(violation.getMessage()).thenReturn("must not be null");

        ErrorResource errorResource = handler.handleConstraintViolation(exception, mock(WebRequest.class));

        assertThat(errorResource.getErrors()).hasSize(1);
        FieldErrorResource fer = errorResource.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo("java.lang.Object");
        assertThat(fer.getField()).isEqualTo("property");
        assertThat(fer.getCode()).isEqualTo("NotNull");
        assertThat(fer.getMessage()).isEqualTo("must not be null");
    }

    @Test
    void handleMethodArgumentNotValidShouldReturnUnprocessableEntityWithErrors() throws Exception {
        // Use MockMvc with a test controller that throws MethodArgumentNotValidException is complex,
        // so we test the overridden method directly.
        org.springframework.web.bind.MethodArgumentNotValidException exception = mock(org.springframework.web.bind.MethodArgumentNotValidException.class);
        org.springframework.validation.BindingResult bindingResult = mock(org.springframework.validation.BindingResult.class);
        FieldError fieldError = new FieldError("object", "field", "rejected", false, null, null, "default message");
        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(Collections.singletonList(fieldError));

        ResponseEntity<Object> response = handler.handleMethodArgumentNotValid(
                exception, new HttpHeaders(), HttpStatus.BAD_REQUEST, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(ErrorResource.class);
        ErrorResource errorResource = (ErrorResource) response.getBody();
        assertThat(errorResource.getErrors()).hasSize(1);
        FieldErrorResource fer = errorResource.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo("object");
        assertThat(fer.getField()).isEqualTo("field");
        assertThat(fer.getCode()).isEqualTo("rejected");
        assertThat(fer.getMessage()).isEqualTo("default message");
    }
}