package com.financialapp.banking.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardRepository extends JpaRepository<CardEntity, String> {

    List<CardEntity> findByAccountIdOrderByIdAsc(String accountId);

    List<CardEntity> findAllByOrderByIdAsc();
}
