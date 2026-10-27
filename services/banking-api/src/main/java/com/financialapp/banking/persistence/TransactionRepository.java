package com.financialapp.banking.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TransactionRepository
        extends JpaRepository<TransactionEntity, String>, JpaSpecificationExecutor<TransactionEntity> {

    List<TransactionEntity> findByTransferIdOrderByDirectionAsc(String transferId);

    List<TransactionEntity> findByAccountId(String accountId);
}
