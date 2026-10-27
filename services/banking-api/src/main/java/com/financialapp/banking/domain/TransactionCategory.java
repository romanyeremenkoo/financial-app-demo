package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionCategory {
    GROCERIES("groceries"),
    DINING("dining"),
    TRANSPORT("transport"),
    HOUSING("housing"),
    UTILITIES("utilities"),
    SHOPPING("shopping"),
    HEALTH("health"),
    ENTERTAINMENT("entertainment"),
    INCOME("income"),
    TRANSFER("transfer");

    private final String wire;

    TransactionCategory(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static TransactionCategory fromWire(String value) {
        for (TransactionCategory c : values()) {
            if (c.wire.equals(value)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Unknown category: " + value);
    }
}
