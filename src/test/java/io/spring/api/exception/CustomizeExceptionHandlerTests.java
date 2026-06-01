package io.spring.api.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.WebRequest;

@ExtendWith(MockitoExtension.class)
public class CustomizeExceptionHandlerTests {

    private CustomizeExceptionHandler handler;

    @Mock
    private WebRequest request;

    @BeforeEach
    void setUp() {
        handler = new CustomizeExceptionHandler();
    }

    @Test
    void handleInvalidRequest_validException_returnsUnprocessableEntity() {
        InvalidRequestException ex = mock(InvalidRequestException.class);
        InvalidRequestException.InvalidRequestExceptionErrors errorsMock = mock(InvalidRequestException.InvalidRequestExceptionErrors.class);
        List<FieldError> fieldErrors = new ArrayList<>();
        fieldErrors.add(new FieldError("object", "field1", "default1"));
        when(ex.getErrors()).thenReturn(errorsMock);
        when(errorsMock.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<Object> response = handler.handleInvalidRequest(ex, request);
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertTrue(response.getBody() instanceof ErrorResource);
        ErrorResource error = (ErrorResource) response.getBody();
        assertEquals(1, error.getErrors().size());
    }

    @Test
    void handleInvalidAuthentication_validException_returnsUnprocessableEntity() {
        InvalidAuthenticationException ex = mock(InvalidAuthenticationException.class);
        when(ex.getMessage()).thenReturn("Invalid credentials");
        ResponseEntity<Object> response = handler.handleInvalidAuthentication(ex, request);
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertTrue(response.getBody() instanceof java.util.Map);
        assertEquals("Invalid credentials", ((java.util.Map<?, ?>) response.getBody()).get("message"));
    }

    @Test
    void handleMethodArgumentNotValid_validException_returnsErrorResource() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        List<FieldError> fieldErrors = new ArrayList<>();
        fieldErrors.add(new FieldError("object", "field2", "errorCode", "defaultMsg"));
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(fieldErrors);

        ResponseEntity<Object> response = handler.handleMethodArgumentNotValid(ex, null, null, request);
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertTrue(response.getBody() instanceof ErrorResource);
        ErrorResource error = (ErrorResource) response.getBody();
        assertEquals(1, error.getErrors().size());
    }

    @Test
    void handleConstraintViolation_withNestedPropertyPath_returnsCorrectFieldName() {
        ConstraintViolationException ex = mock(ConstraintViolationException.class);
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        javax.validation.Path propertyPath = mock(javax.validation.Path.class);
        when(ex.getConstraintViolations()).thenReturn(java.util.Collections.singleton(violation));
        when(violation.getRootBeanClass()).thenReturn((Class) String.class);
        when(violation.getPropertyPath()).thenReturn(propertyPath);
        when(propertyPath.toString()).thenReturn("method.arg.field1");
        when(violation.getConstraintDescriptor()).thenReturn(mock(javax.validation.metadata.ConstraintDescriptor.class));
        when(violation.getConstraintDescriptor().getAnnotation()).thenReturn(mock(java.lang.annotation.Annotation.class));
        when(violation.getConstraintDescriptor().getAnnotation().annotationType()).thenReturn((Class) javax.validation.constraints.NotNull.class);
        when(violation.getMessage()).thenReturn("must not be null");

        ErrorResource error = handler.handleConstraintViolation(ex, request);
        assertEquals(1, error.getErrors().size());
        assertEquals("field1", error.getErrors().get(0).getField());
    }
}