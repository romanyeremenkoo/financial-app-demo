package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.CardStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateCardStatusRequest(
        @NotNull(message = "A status is required.") CardStatus status) {
}
