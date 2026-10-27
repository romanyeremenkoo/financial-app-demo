package com.financialapp.banking.domain;

/**
 * A referenced resource does not exist. Maps to HTTP 404 in the API layer.
 */
public class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(ErrorCode code, String message) {
        super(code, message);
    }
}
