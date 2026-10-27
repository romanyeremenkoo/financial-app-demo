package com.financialapp.banking.application;

import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.ResourceNotFoundException;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AccountService {

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public List<AccountEntity> listAccounts() {
        return accountRepository.findAllByOrderBySortOrderAsc();
    }

    public AccountEntity getAccount(String accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ACCOUNT_NOT_FOUND,
                        "The requested account could not be found."));
    }
}
