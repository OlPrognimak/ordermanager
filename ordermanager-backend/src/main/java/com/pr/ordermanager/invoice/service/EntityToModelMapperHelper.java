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

import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.InvoiceItem;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.InvoiceItemModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.utils.Utils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * The mapping helper for mapping JPA Entity to Rest Model POJO object
 *
 * @author Oleksandr Prognimak
 */
public class EntityToModelMapperHelper {

    private EntityToModelMapperHelper(){

    }


    /**
     * Maps the data from source Entity object {@link Invoice} to rest model object {@link InvoiceFormModel}
     * @param source the source Entity object {@link Invoice} with data for mapping to the target object
     * @return the target object {@link InvoiceFormModel}
     */
    public static InvoiceFormModel mapInvoiceEntityToFormModel(Invoice source){
        InvoiceFormModel invoiceFormModel = InvoiceFormModel.builder()
            .id(source.getId())
            .personRecipientId(
                    source.getInvoiceRecipientPerson().getId())
             .recipientFullName(
                     (Utils.emptyOrValue(source.getInvoiceRecipientPerson().getPersonFirstName())+" "+
                             Utils.emptyOrValue(source.getInvoiceRecipientPerson().getPersonLastName())+ " "+
                             Utils.emptyOrValue(source.getInvoiceRecipientPerson().getCompanyName())
                     ).trim()
             )
            .invoiceNumber(source.getInvoiceNumber())
            .invoiceDescription(source.getInvoiceDescription())
            .invoiceDate(source.getInvoiceDate())
            .creationDate(source.getCreationDate())
            .rateType(source.getRateType().name())
            .personSupplierId(source.getInvoiceSupplierPerson().getId())
                .supplierFullName(
                        (Utils.emptyOrValue(source.getInvoiceSupplierPerson().getPersonFirstName())+" "+
                                Utils.emptyOrValue(source.getInvoiceSupplierPerson().getPersonLastName())+ " "+
                                Utils.emptyOrValue(source.getInvoiceSupplierPerson().getCompanyName())).trim())
             .totalSumBrutto(source.getTotalSumBrutto())
                .totalSumNetto(source.getTotalSumNetto())
             .invoiceItems(
                source.getInvoiceItems()
                    .stream()
                    .map(i->mapEntityToModelInvoiceItem(i)).collect(Collectors.toList())
            ).build();
        return invoiceFormModel;
    }

    /**
     * Maps the data from source Entity object {@link InvoiceItem} to rest model object {@link InvoiceItemModel}
     * @param source the source Entity object {@link InvoiceItem} with data for mapping to the target
     * @return the target object {@link InvoiceFormModel}
     */
    public static InvoiceItemModel mapEntityToModelInvoiceItem(InvoiceItem source){
        return InvoiceItemModel.builder()
                .catalogItemId (source.getItemCatalog().getId())
                .itemPrice(source.getItemPrice())
                .description(source.getItemCatalog().getDescription())
                .amountItems(source.getAmountItems())
                .vat(source.getVat())
                .sumNetto(source.getSumNetto())
                .sumBrutto(source.getSumBrutto())
                .build();
    }


    public static List<DropdownDataType> mapListCatalogItemsToDropdownType(List<ItemCatalog> itemCatalogs){
        return itemCatalogs.stream().map(c->new DropdownDataType(
                c.getShortDescription()+ " : Price :"+c.getItemPrice()+ " " ,
                String.valueOf(c.getId()))).collect(Collectors.toList());
    }


    public static ItemCatalogModel mapEntityToItemCatalogModel(ItemCatalog itemCatalog){
        return ItemCatalogModel.builder()
                .id(itemCatalog.getId())
                .description(itemCatalog.getDescription())
                .shortDescription(itemCatalog.getShortDescription())
                .itemPrice(itemCatalog.getItemPrice())
                .vat(itemCatalog.getVat())
                .build();
    }

}
