package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.AccountDto;
import com.financialapp.banking.application.AccountService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AccountController {

    private final AccountService accountService;
    private final DtoMapper mapper;

    public AccountController(AccountService accountService, DtoMapper mapper) {
        this.accountService = accountService;
        this.mapper = mapper;
    }

    @GetMapping("/accounts")
    public List<AccountDto> listAccounts() {
        return accountService.listAccounts().stream().map(mapper::toAccountDto).toList();
    }

    @GetMapping("/accounts/{accountId}")
    public AccountDto getAccount(@PathVariable String accountId) {
        return mapper.toAccountDto(accountService.getAccount(accountId));
    }
}
