package io.spring.api.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.lang.annotation.Annotation;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import javax.validation.Path;
import javax.validation.metadata.ConstraintDescriptor;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.WebRequest;

class CustomizeExceptionHandlerTests {

    private final CustomizeExceptionHandler handler = new CustomizeExceptionHandler();

    @Test
    void pingShouldReturnPongWithTextPlain() {
        ResponseEntity<String> response = handler.ping();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("pong");
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_PLAIN);
    }

    @Test
    void handleInvalidRequestShouldReturn422WithErrorResource() {
        InvalidRequestException exception = mock(InvalidRequestException.class);
        Errors errors = mock(Errors.class);
        FieldError fieldError = new FieldError("objectName", "fieldName", "errorCode");
        List<FieldError> fieldErrors = Collections.singletonList(fieldError);

        when(exception.getErrors()).thenReturn(errors);
        when(errors.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<Object> response = handler.handleInvalidRequest(exception, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).isInstanceOf(ErrorResource.class);
        ErrorResource errorResource = (ErrorResource) response.getBody();
        assertThat(errorResource.getErrors()).hasSize(1);
        FieldErrorResource fer = errorResource.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo("objectName");
        assertThat(fer.getField()).isEqualTo("fieldName");
        assertThat(fer.getCode()).isEqualTo("errorCode");
    }

    @Test
    void handleInvalidAuthenticationShouldReturn422WithMessage() {
        InvalidAuthenticationException exception = new InvalidAuthenticationException("auth error");

        ResponseEntity<Object> response = handler.handleInvalidAuthentication(exception, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(HashMap.class);
        HashMap<String, Object> body = (HashMap<String, Object>) response.getBody();
        assertThat(body).containsEntry("message", "auth error");
    }

    @Test
    void handleMethodArgumentNotValidShouldReturn422WithErrorResource() throws Exception {
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError springError = new FieldError("obj2", "field2", "code2");
        List<FieldError> fieldErrors = Collections.singletonList(springError);

        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<Object> response = handler.handleMethodArgumentNotValid(
                exception, new HttpHeaders(), HttpStatus.BAD_REQUEST, mock(WebRequest.class));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isInstanceOf(ErrorResource.class);
        ErrorResource error = (ErrorResource) response.getBody();
        assertThat(error.getErrors()).hasSize(1);
        FieldErrorResource fer = error.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo("obj2");
        assertThat(fer.getField()).isEqualTo("field2");
        assertThat(fer.getCode()).isEqualTo("code2");
    }

    @Test
    void handleConstraintViolationShouldReturn422WithErrorResource() {
        ConstraintViolationException exception = mock(ConstraintViolationException.class);
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        ConstraintDescriptor<?> descriptor = mock(ConstraintDescriptor.class);
        Annotation annotation = mock(Annotation.class);

        when(violation.getRootBeanClass()).thenReturn((Class) String.class);
        when(violation.getPropertyPath()).thenReturn(mock(Path.class));
        when(violation.getConstraintDescriptor()).thenReturn(descriptor);
        when(descriptor.getAnnotation()).thenReturn(annotation);
        when(annotation.annotationType()).thenReturn((Class) NotNull.class); // any annotation
        when(violation.getMessage()).thenReturn("must not be null");

        Set<ConstraintViolation<?>> violations = new HashSet<>();
        violations.add(violation);
        when(exception.getConstraintViolations()).thenReturn(violations);

        ErrorResource error = handler.handleConstraintViolation(exception, mock(WebRequest.class));

        assertThat(error.getErrors()).hasSize(1);
        FieldErrorResource fer = error.getErrors().get(0);
        assertThat(fer.getObjectName()).isEqualTo(String.class.getName());
        // property path after split could be empty string or something; depends on actual Path mock.
        // We'll just assert that code and message are set.
        assertThat(fer.getCode()).isEqualTo(NotNull.class.getSimpleName());
        assertThat(fer.getMessage()).isEqualTo("must not be null");
    }

    // Dummy annotation to simulate constraint annotation type
    private @interface NotNull {
    }
}