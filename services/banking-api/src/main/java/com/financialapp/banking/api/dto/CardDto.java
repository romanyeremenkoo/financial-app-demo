package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.CardNetwork;
import com.financialapp.banking.domain.CardStatus;

public record CardDto(
        String id,
        String accountId,
        String label,
        String holderName,
        String maskedNumber,
        String expiry,
        CardNetwork network,
        CardStatus status) {
}
