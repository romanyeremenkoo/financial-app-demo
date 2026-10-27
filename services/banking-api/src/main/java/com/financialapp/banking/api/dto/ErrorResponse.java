package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.ErrorCode;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Canonical error body. {@code details} is omitted when empty (global non-null
 * Jackson inclusion) and never carries stack traces or SQL.
 */
public record ErrorResponse(
        ErrorCode code,
        String message,
        OffsetDateTime timestamp,
        List<ErrorDetail> details) {

    public static ErrorResponse of(ErrorCode code, String message, OffsetDateTime timestamp) {
        return new ErrorResponse(code, message, timestamp, null);
    }

    public record ErrorDetail(String field, ErrorCode code, String message) {
    }
}
