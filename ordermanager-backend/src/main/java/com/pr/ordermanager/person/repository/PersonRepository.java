/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.person.repository;


import com.pr.ordermanager.person.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * @author Oleksandr Prognimak
 */
@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {

    /**
     *
     * @param userName the name of logged  user to the application
     * @return all persons which belongs to the logged user
     */
    @Query("select p from Person p where p.invoiceUser.username = :userName")
    List<Person> findAllPersonsByUserName(String userName);

    @Query("select p from Person p where p.invoiceUser.username = :userName and p.created between :startDate and :endDate")
    List<Person> findAllPersonsByUserNameAndCreatedBetween(String userName, Instant startDate, Instant endDate);

    /**
     * Delete person by person id.
     *
     * @param personId person
     */
    @Modifying
    @Query("delete from Person p where p.id = :personId")
    void deletePersonByPersonId(@Param("personId") Long personId);

    @Query("""
        SELECT i.id FROM Invoice i 
            JOIN i.invoiceRecipientPerson recipient 
            JOIN i.invoiceSupplierPerson supplier 
            WHERE (recipient.id = :personId) OR (supplier.id = :personId)
        """)
    Long[] findPersonUsageInInvoices(@Param("personId") Long personId);


}
