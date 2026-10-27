package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionDirection {
    DEBIT("debit"),
    CREDIT("credit");

    private final String wire;

    TransactionDirection(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static TransactionDirection fromWire(String value) {
        for (TransactionDirection d : values()) {
            if (d.wire.equals(value)) {
                return d;
            }
        }
        throw new IllegalArgumentException("Unknown direction: " + value);
    }
}
