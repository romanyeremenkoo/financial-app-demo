package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionStatus {
    COMPLETED("completed"),
    PENDING("pending"),
    FAILED("failed");

    private final String wire;

    TransactionStatus(String wire) {
        this.wire = wire;
    }

    /** Only completed entries affect balances and analytics. */
    public boolean affectsBalance() {
        return this == COMPLETED;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static TransactionStatus fromWire(String value) {
        for (TransactionStatus s : values()) {
            if (s.wire.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }
}
