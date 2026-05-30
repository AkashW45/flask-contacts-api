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
    }
}