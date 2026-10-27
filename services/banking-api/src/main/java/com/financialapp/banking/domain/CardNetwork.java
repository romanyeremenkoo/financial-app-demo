package com.financialapp.banking.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CardNetwork {
    VISA("visa"),
    MASTERCARD("mastercard");

    private final String wire;

    CardNetwork(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static CardNetwork fromWire(String value) {
        for (CardNetwork n : values()) {
            if (n.wire.equals(value)) {
                return n;
            }
        }
        throw new IllegalArgumentException("Unknown card network: " + value);
    }
}
