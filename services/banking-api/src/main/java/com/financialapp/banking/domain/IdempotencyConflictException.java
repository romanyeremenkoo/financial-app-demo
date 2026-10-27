package com.financialapp.banking.domain;

/**
 * An idempotency key was reused with a different payload. Maps to HTTP 409.
 */
public class IdempotencyConflictException extends DomainException {

    public IdempotencyConflictException() {
        super(ErrorCode.IDEMPOTENCY_KEY_REUSED,
                "This idempotency key was already used with a different transfer.");
    }
}
