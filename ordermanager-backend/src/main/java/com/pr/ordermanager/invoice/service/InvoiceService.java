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
package com.pr.ordermanager.invoice.service;


import com.pr.ordermanager.common.model.RequestPeriodDate;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import com.pr.ordermanager.person.entity.Person;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.UserRepository;
import com.pr.ordermanager.security.service.UserService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;

/**
 * @author  Oleksandr Prognimak
 */
@Service
public class InvoiceService {
    private static final Logger logger = LogManager.getLogger(InvoiceService.class);
    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    private ItemCatalogRepository itemCatalogRepository;
    @Autowired
    private UserService userService;

    @Autowired
    private InvoiceMappingService invoiceMappingService;

    /**
     *
     * @param idItemCatalog the id of item from catalog
     * @return foud item
     */
    public ItemCatalog getItemCatalog(Long idItemCatalog){
       return itemCatalogRepository.findById(idItemCatalog).get();
    }

    /**
     *
     * @param userName the currently loged user
     * @return the list of invoices which belongs to the user {@code userName}
     */
    public List<Invoice> getAllUserInvoices(String userName){
        InvoiceUser user = userRepository.findByUsername(userName);
        List<Invoice> invoices = invoiceRepository.findByInvoiceUser(user);
        return invoices;
    }

    /**
     *
     * @param userName the currently loged user
     * @param periodDate the date period
     * @return the list of invoices which belongs to the user {@code userName}
     */
    public List<Invoice> getAllUserInvoices(String userName, RequestPeriodDate periodDate){
        InvoiceUser user = userRepository.findByUsername(userName);
        OffsetDateTime endDate = null;
        Assert.notNull(periodDate.getStartDate(),"The start date can not be null");
        if(periodDate.getEndDate() != null) {
            endDate = periodDate.getEndDate();
        } else {
            endDate = OffsetDateTime.now();
        }
        List<Invoice> invoices = invoiceRepository.findByInvoiceUserAndCreationDateBetween(
                user, periodDate.getStartDate(), endDate);
        return invoices;
    }

    /**
     *
     * @param invoice the invoice to be saved
     * @param userName the currently logined user
     * @return result of execution
     *
     * @exception  OrderManagerException in case if invoice can not be saved
     */
    public String saveInvoice(Invoice invoice, String userName){
            String invoiceNumder=null;
            InvoiceUser user = userService.getUserOrException(userName);
            try {
                invoice.setInvoiceUser(user);
                invoiceRepository.save(invoice);
                invoiceNumder = invoice.getInvoiceNumber();
            }catch(Exception ex) {
                throw new OrderManagerException(CODE_0000,"Unexpected exception",ex);
            }
        return invoiceNumder;
    }

    /**
     * Update {@link Person} to the database
     * @param invoices   the invoice to be saved
     * @param userName currently authenticated user name
     * @throws OrderManagerException in case if person can not be saved
     */
    public void updateInvoices(final List<InvoiceFormModel> invoices, final String userName) {

        invoices.forEach(i -> {
            Optional<Invoice> invoiceEntityOpt = invoiceRepository.findById(i.getId());
            if(invoiceEntityOpt.isPresent()) {
                Invoice invoice = invoiceEntityOpt.get();
                invoiceMappingService.mapInvoiceModelToExistedEntity(i, invoice);
                try {
                    invoiceRepository.save(invoice);
                } catch (Exception ex) {
                    logger.error(ex);
                    throw new OrderManagerException(CODE_0000, "Unexpected exception", ex);
                }
            }
        });


    }

    public Invoice getInvoice(String invoiceNumber){
        return invoiceRepository.findByInvoiceNumber(invoiceNumber);
    }

    /**
     *
     * @return retrieve all items from catalog
     */
    public List<ItemCatalog> getAllCatalogItems(){
        return itemCatalogRepository.findAll(
                Sort.by(Sort.Direction.ASC, "shortDescription"));
    }

    /**
     *
     * @param itemCatalog save catalod item to the database
     */
    public void saveItemCatalog(ItemCatalog itemCatalog) {
        try {
            itemCatalogRepository.save(itemCatalog);
        } catch (Exception ex) {
            logger.error("Can not save catalog item",ex);
            throw new OrderManagerException(CODE_0000, "Unexpected exception", ex);
        }
    }

    /**
     * Delete invoice
     *
     * @param invoiceId id of invoice
     * @param name user name
     */
    public void deleteInvoice(Long invoiceId, String name) {
        Optional<Invoice> invoiceOptional = invoiceRepository.findById(invoiceId);
        if (invoiceOptional.isPresent()) {
            invoiceRepository.delete(invoiceOptional.get());
        }
    }
}
