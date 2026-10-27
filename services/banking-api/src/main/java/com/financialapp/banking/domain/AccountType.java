package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AccountType {
    CURRENT("current"),
    SAVINGS("savings"),
    JOINT("joint");

    private final String wire;

    AccountType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static AccountType fromWire(String value) {
        for (AccountType t : values()) {
            if (t.wire.equals(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown account type: " + value);
    }
}
