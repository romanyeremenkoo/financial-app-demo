package com.financialapp.banking.domain;

/**
 * A business invariant was violated. These map to HTTP 422 in the API layer.
 */
public class BusinessRuleException extends DomainException {

    public BusinessRuleException(ErrorCode code, String message) {
        super(code, message);
    }
}
