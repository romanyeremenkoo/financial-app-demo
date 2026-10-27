package com.financialapp.banking.api.dto;

import java.util.List;

public record TransactionPageDto(
        List<TransactionDto> items,
        int page,
        int size,
        long totalItems,
        int totalPages) {
}
