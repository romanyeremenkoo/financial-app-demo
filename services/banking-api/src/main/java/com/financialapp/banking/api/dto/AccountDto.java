package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.AccountStatus;
import com.financialapp.banking.domain.AccountType;

public record AccountDto(
        String id,
        String name,
        AccountType type,
        String maskedIban,
        MoneyDto balance,
        MoneyDto available,
        AccountStatus status) {
}
