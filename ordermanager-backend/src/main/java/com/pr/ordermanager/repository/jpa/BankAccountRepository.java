package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.jpa.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
}
