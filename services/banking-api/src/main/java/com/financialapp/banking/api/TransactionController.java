package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.TransactionDto;
import com.financialapp.banking.api.dto.TransactionPageDto;
import com.financialapp.banking.application.TransactionService;
import com.financialapp.banking.application.TransactionService.TransactionQuery;
import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.persistence.TransactionEntity;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
public class TransactionController {

    private final TransactionService transactionService;
    private final DtoMapper mapper;

    public TransactionController(TransactionService transactionService, DtoMapper mapper) {
        this.transactionService = transactionService;
        this.mapper = mapper;
    }

    @GetMapping("/transactions")
    public TransactionPageDto listTransactions(
            @RequestParam(required = false) String accountId,
            @RequestParam(required = false) TransactionCategory category,
            @RequestParam(required = false) TransactionDirection direction,
            @RequestParam(required = false) @Size(max = 120) String search,
            @RequestParam(required = false, defaultValue = "date-desc") String sort,
            @RequestParam(required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(required = false, defaultValue = "500") @Min(1) @Max(1000) int size) {

        TransactionQuery query =
                new TransactionQuery(accountId, category, direction, search, sort, page, size);
        Page<TransactionEntity> result = transactionService.search(query);
        return new TransactionPageDto(
                result.getContent().stream()
                        .map(mapper::toTransactionDto)
                        .toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @GetMapping("/transactions/{transactionId}")
    public TransactionDto getTransaction(@PathVariable String transactionId) {
        return mapper.toTransactionDto(transactionService.getTransaction(transactionId));
    }
}
