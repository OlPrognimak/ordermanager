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
package com.pr.ordermanager.report.utils;

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.report.model.InvoiceReportItem;
import com.pr.ordermanager.report.model.InvoiceReportModel;

import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The mapping helper for mapping JPA Entity to Report Model POJO object
 *
 * @author Oleksandr Prognimak
 */
public class EntityToReportMapperUtil {

    private EntityToReportMapperUtil() {

    }


    /**
     * Maps the data from source Entity object {@link Invoice} to report model object {@link InvoiceReportModel}
     *
     * @param source the source Entity object {@link Invoice} with data for mapping to the target object
     * @return the target object {@link InvoiceReportModel}
     */
    public static InvoiceReportModel mapInvoiceEntityToReportModel(Invoice source) {
        InvoiceReportModel invoiceFormModel = InvoiceReportModel.builder()
                .invoiceId(source.getId())
                .recipientCompanyName(source.getInvoiceRecipientPerson().getCompanyName())
                .recipientLastName(source.getInvoiceRecipientPerson().getPersonLastName())
                .recipientFirstName(source.getInvoiceRecipientPerson().getPersonFirstName())
                .recipientStreet(source.getInvoiceRecipientPerson().getPersonAddress().get(0).getStreet())
                .recipientCity(source.getInvoiceRecipientPerson().getPersonAddress().get(0).getCity())
                .recipientZipCode(source.getInvoiceRecipientPerson().getPersonAddress().get(0).getZipCode())
                .recipientPostBoxCode(source.getInvoiceRecipientPerson().getPersonAddress().get(0).getPostBoxCode())
                .invoiceNumber(source.getInvoiceNumber())
                .invoiceDescription(source.getInvoiceDescription())
                .invoiceDate(
                        Date.from(
                                source.getInvoiceDate().toLocalDate().atStartOfDay(
                                        ZoneId.systemDefault()).toInstant())

                )
                .creationDate(
                        Date.from(
                                source.getCreationDate().toLocalDate().atStartOfDay(
                                        ZoneId.systemDefault()).toInstant())
                )
                .rateType(source.getRateType().name())
                .personType(source.getInvoiceSupplierPerson().getPersonType().name())
                .supplierCompanyName(source.getInvoiceSupplierPerson().getCompanyName())
                .supplierLastName(source.getInvoiceSupplierPerson().getPersonLastName())
                .supplierFirstName(source.getInvoiceSupplierPerson().getPersonFirstName())
                .supplierStreet(source.getInvoiceSupplierPerson().getPersonAddress().get(0).getStreet())
                .supplierCity(source.getInvoiceSupplierPerson().getPersonAddress().get(0).getCity())
                .supplierZipCode(source.getInvoiceSupplierPerson().getPersonAddress().get(0).getZipCode())
                .supplierPostBoxCode(source.getInvoiceSupplierPerson().getPersonAddress().get(0).getPostBoxCode())
                .supplierTaxNumber(source.getInvoiceSupplierPerson().getTaxNumber())
                .supplierBankName(source.getInvoiceSupplierPerson().getBankAccount().get(0).getBankName())
                .supplierIban(source.getInvoiceSupplierPerson().getBankAccount().get(0).getIban())
                .supplierBicSwift(source.getInvoiceSupplierPerson().getBankAccount().get(0).getBicSwift())
                .supplierAccountNumber(source.getInvoiceSupplierPerson().getBankAccount().get(0).getAccountNumber())
                .totalSunBrutto(source.getTotalSumBrutto())
                .totalSumNetto(source.getTotalSumNetto())
                .items(
                        source.getInvoiceItems()
                                .stream()
                                .map(i -> mapEntityToInvoiceReportItem(i)).collect(Collectors.toList())
                ).build();
        return invoiceFormModel;
    }

    /**
     * Maps the data from source Entity object {@link InvoiceItem} to rest model object {@link InvoiceReportItem}
     *
     * @param source the source Entity object {@link InvoiceItem} with data for mapping to the target
     * @return the target object {@link InvoiceReportItem}
     */
    private static InvoiceReportItem mapEntityToInvoiceReportItem(InvoiceItem source) {
        return InvoiceReportItem.builder()
                .itemPrice(source.getItemPrice())
                .description(source.getItemCatalog().getDescription())
                .amountItems(source.getAmountItems())
                .vat(source.getVat())
                .sumNetto(source.getSumNetto())
                .sumBrutto(source.getSumBrutto())
                .build();
    }


}
