package com.financialapp.banking.domain;

/**
 * Raised when two {@link Money} values of different currencies are combined.
 */
public class CurrencyMismatchException extends BusinessRuleException {

    public CurrencyMismatchException(Currency expected, Currency actual) {
        super(ErrorCode.CURRENCY_MISMATCH,
                "Currency mismatch: expected " + expected + " but was " + actual + ".");
    }

    public CurrencyMismatchException(String message) {
        super(ErrorCode.CURRENCY_MISMATCH, message);
    }
}
