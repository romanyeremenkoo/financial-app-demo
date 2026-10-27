package com.financialapp.banking.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<AccountEntity, String> {

    List<AccountEntity> findAllByOrderBySortOrderAsc();

    /**
     * Fetches an account acquiring a {@code SELECT ... FOR UPDATE} row lock.
     * Callers must acquire locks for multiple accounts in a deterministic order
     * (sorted by id) to make deadlocks impossible.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AccountEntity a where a.id = :id")
    Optional<AccountEntity> findByIdForUpdate(@Param("id") String id);
}
