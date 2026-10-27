package com.financialapp.banking.domain;

/**
 * The required {@code Idempotency-Key} header was missing or blank. Maps to HTTP 400.
 */
public class IdempotencyKeyRequiredException extends DomainException {

    public IdempotencyKeyRequiredException() {
        super(ErrorCode.IDEMPOTENCY_KEY_REQUIRED,
                "An Idempotency-Key header is required.");
    }
}
