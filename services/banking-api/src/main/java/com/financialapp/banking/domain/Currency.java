package com.financialapp.banking.domain;

/**
 * Supported ISO-4217 currencies and their minor-unit precision, as defined by the
 * contract. Both supported currencies use a precision of 2.
 */
public enum Currency {
    EUR(2),
    GBP(2);

    private final int precision;

    Currency(int precision) {
        this.precision = precision;
    }

    public int precision() {
        return precision;
    }

    /** The number of minor units in one major unit (e.g. 100 for a precision of 2). */
    public long minorUnitsPerMajor() {
        long factor = 1;
        for (int i = 0; i < precision; i++) {
            factor *= 10;
        }
        return factor;
    }
}
