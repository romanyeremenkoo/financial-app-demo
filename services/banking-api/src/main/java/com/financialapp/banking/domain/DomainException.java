package com.financialapp.banking.domain;

/**
 * Base type for domain failures. Each failure carries a stable {@link ErrorCode}
 * so the API layer can translate it into the contract error body without leaking
 * internals.
 */
public class DomainException extends RuntimeException {

    private final ErrorCode code;

    public DomainException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
