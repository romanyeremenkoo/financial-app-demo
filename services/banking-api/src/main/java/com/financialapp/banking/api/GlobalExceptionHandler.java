package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.ErrorResponse;
import com.financialapp.banking.api.dto.ErrorResponse.ErrorDetail;
import com.financialapp.banking.domain.BusinessRuleException;
import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.IdempotencyConflictException;
import com.financialapp.banking.domain.IdempotencyKeyRequiredException;
import com.financialapp.banking.domain.ResourceNotFoundException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Translates exceptions into the contract {@code Error} body. Never leaks stack
 * traces, SQL or other internals into the response.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, ex.code(), ex.getMessage(), null);
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(IdempotencyConflictException ex) {
        return body(HttpStatus.CONFLICT, ex.code(), ex.getMessage(), null);
    }

    @ExceptionHandler(IdempotencyKeyRequiredException.class)
    public ResponseEntity<ErrorResponse> handleKeyRequired(IdempotencyKeyRequiredException ex) {
        return body(HttpStatus.BAD_REQUEST, ex.code(), ex.getMessage(), null);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleException ex) {
        return body(HttpStatus.UNPROCESSABLE_ENTITY, ex.code(), ex.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleBodyValidation(MethodArgumentNotValidException ex) {
        List<ErrorDetail> details = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            details.add(new ErrorDetail(fe.getField(), ErrorCode.VALIDATION_FAILED,
                    fe.getDefaultMessage()));
        }
        return body(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
                "The request could not be validated.", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleParamValidation(ConstraintViolationException ex) {
        List<ErrorDetail> details = new ArrayList<>();
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            details.add(new ErrorDetail(lastNode(violation), ErrorCode.VALIDATION_FAILED,
                    violation.getMessage()));
        }
        return body(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
                "The request could not be validated.", details);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleUnreadable(Exception ex) {
        return body(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
                "The request could not be validated.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error handling request", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                "An unexpected error occurred.", null);
    }

    private static String lastNode(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        int dot = path.lastIndexOf('.');
        return dot >= 0 ? path.substring(dot + 1) : path;
    }

    private static ResponseEntity<ErrorResponse> body(HttpStatus status, ErrorCode code,
                                                      String message, List<ErrorDetail> details) {
        ErrorResponse error = new ErrorResponse(code, message,
                OffsetDateTime.now(ZoneOffset.UTC),
                details == null || details.isEmpty() ? null : details);
        return ResponseEntity.status(status).body(error);
    }
}
