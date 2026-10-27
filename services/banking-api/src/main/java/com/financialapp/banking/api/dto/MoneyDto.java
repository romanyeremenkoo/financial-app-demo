package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.Currency;

/**
 * Monetary value on the wire: integer minor units plus explicit currency.
 */
public record MoneyDto(Long amountMinor, Currency currency) {
}
