package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CardStatus {
    ACTIVE("active"),
    FROZEN("frozen");

    private final String wire;

    CardStatus(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static CardStatus fromWire(String value) {
        for (CardStatus s : values()) {
            if (s.wire.equals(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown card status: " + value);
    }
}
