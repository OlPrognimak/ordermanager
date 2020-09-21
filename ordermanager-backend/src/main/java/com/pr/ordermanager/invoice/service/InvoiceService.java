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


import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.repository.InvoiceRepository;
import com.pr.ordermanager.invoice.repository.ItemCatalogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0000;
import static com.pr.ordermanager.exception.ErrorCode.CODE_0002;

/**
 * @author  Oleksandr Prognimak
 */
@Service
@Transactional
public class InvoiceService {
    @Autowired
    InvoiceRepository invoiceRepository;
    @Autowired
    private ItemCatalogRepository itemCatalogRepository;

    /**
     *
     * @param idItemCatalog the id of item from catalog
     * @return foud item
     */
    public ItemCatalog getItemCatalog(Long idItemCatalog){
       return itemCatalogRepository.findById(idItemCatalog).get();
    }




    //TODO need to implement serch by parametes
    public List<Invoice> getInvoices(){
        //
        return invoiceRepository.findAll();
    }


    /**
     *
     * @param invoice the invoice to be saved
     * @return result of execution
     *
     * @exception  OrderManagerException in case if invoice can not be saved
     */
    public String saveInvoice(Invoice invoice){
        String invoiceNumder=null;
        if (validateInvoiceData(invoice) ){
            try {
                invoiceRepository.save(invoice);
                invoiceNumder = invoice.getInvoiceNumber();
            }catch(Exception ex) {
                throw new OrderManagerException(CODE_0000,"Unexpected exception",ex);
            }
        }else{
            throw new OrderManagerException(CODE_0002,"The validation of Person is failed.");
        }

        return invoiceNumder;
    }

    public Invoice getInvoice(String invoiceNumber){
        Invoice invoiceData = invoiceRepository.findByInvoiceNumber(invoiceNumber);
        return invoiceData;
    }

    private boolean validateInvoiceData(Invoice invoiceData){
        return true;
    }



    public List<ItemCatalog> getAllCatalogItems(){
        return itemCatalogRepository.findAll(
                Sort.by(Sort.Direction.ASC, "shortDescription"));
    }

    public void saveItemCatalog(ItemCatalog itemCatalog){
       itemCatalogRepository.save(itemCatalog);
    }

}
