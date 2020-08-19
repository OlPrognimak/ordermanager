package com.pr.ordermanager.repository.jpa;

import com.pr.ordermanager.jpa.entity.InvoiceData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceDataRepository extends JpaRepository<InvoiceData, Long> {

    InvoiceData findByInvoiceNumber(String invoiceNumber);
}
