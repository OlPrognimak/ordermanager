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
package com.pr.ordermanager.invoice.controller;


import com.pr.ordermanager.common.model.CreatedResponse;
import com.pr.ordermanager.common.model.DropdownDataType;
import com.pr.ordermanager.common.model.RequestPeriodDate;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.entity.Invoice;
import com.pr.ordermanager.invoice.entity.ItemCatalog;
import com.pr.ordermanager.invoice.model.InvoiceFormModel;
import com.pr.ordermanager.invoice.model.ItemCatalogModel;
import com.pr.ordermanager.invoice.service.EntityToModelMapperHelper;
import com.pr.ordermanager.invoice.service.InvoiceMappingService;
import com.pr.ordermanager.invoice.service.InvoiceService;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.OK;

/**
 * This controller provides the rest services for UI and  for management invoices on UI side
 */
@OpenAPIDefinition(
        info = @Info(
                title = "This controller contains the end points for deliver metadata for invoices and person forms" +
                        "and for management with ones",
                contact = @Contact(url = "", name = "Oleksandr Prognimak", email = "ol.prognimak@gmail.com")
        )
)
@RestController
@CrossOrigin()
public class InvoiceController {

    Logger logger = LogManager.getLogger(InvoiceController.class);

    private static final String PATH = "/invoice";
    private static final String PATH_INVOICE = PATH;
    private static final String PATH_INVOICES_LIST = PATH + "/invoicesList";

    private static final String PATH_INVOICES_LIST_PERIOD = PATH + "/invoicesListPeriod";
    private static final String PATH_ITEM_CATALOG = PATH + "/itemcatalog";

    private static final String PATH_ITEMSCATALOG_DROPDOWN = PATH + "/itemscatalogdropdown";
    private static final String APPLICATION_JSON = "application/json";
    @Autowired
    InvoiceService invoiceService;
    @Autowired
    InvoiceMappingService invoiceMappingService;
    @Autowired
    private Environment env;


    @Operation(description = "Puts new invoice to the database",
            method = "put",
            operationId = "putNewInvoice",
            responses = {
                    @ApiResponse(responseCode = "201",
                            description = "The saving of new invoice to the database was successful",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0002 occurs in case of validation request error, " +
                                    "and with code CODE_0000 in case if something else unexpected happens ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Invoice",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    /**
     * Saves the new invoice to the database
     * @param invoiceFormModel the model with invoice data
     * @param securityPrincipal injects by springBoot
     * @return response with status und created id of report
     */
    @PutMapping(value = PATH_INVOICE, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewInvoice(
            @RequestBody @Valid InvoiceFormModel invoiceFormModel, Principal securityPrincipal) {
        InvoiceValidator.validateInvoiceData(invoiceFormModel);
        Invoice invoice = invoiceMappingService.mapInvoiceModelToEntity(invoiceFormModel);
        invoiceService.saveInvoice(invoice,securityPrincipal.getName());
        return ResponseEntity.status(CREATED).body(new CreatedResponse(invoice.getId()));
    }



    /**
     * Save changes of invoices to the database
     * @param invoiceFormModels the list of models with invoice data
     * @param securityPrincipal injects by springBoot
     * @return response with status und created id of report
     */
    @PostMapping(value = PATH_INVOICE,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> updateInvoice(
            @RequestBody @Valid List<InvoiceFormModel> invoiceFormModels, Principal securityPrincipal) {

        invoiceFormModels.forEach(im -> {
            InvoiceValidator.validateInvoiceData(im);
        });

        invoiceService.updateInvoices(invoiceFormModels,securityPrincipal.getName());
        return ResponseEntity.status(OK).body(new CreatedResponse(1L));
    }


    @DeleteMapping(value= PATH_INVOICE+"/{invoiceId}", produces = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> deletePerson(
            @PathVariable @Valid Long invoiceId, Principal principal) {
        invoiceService.deleteInvoice(invoiceId, principal.getName());

        return ResponseEntity.status(OK).body(new CreatedResponse(invoiceId));
    }


    @Operation(description = "Puts new ItemCatalog to the database",
            method = "put",
            operationId = "putNewCatalogItem",
            responses = {
                    @ApiResponse(responseCode = "201",
                            description = "The saving of new ItemCatalog to the database was successful",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0000 in case if something unexpected happens ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Invoice",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    /**
     * Saves the new ItemCatalog to the database
     * @param itemCatalogModel the model with ItemCatalog data
     *
     * @return response with status und created id of report
     */
    @RequestMapping(value = PATH_ITEM_CATALOG, method = RequestMethod.PUT,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<CreatedResponse> putNewCatalogItem(
            @RequestBody @Valid ItemCatalogModel itemCatalogModel) {
        ItemCatalog itemCatalog = invoiceMappingService.mapModelToItemCatalogEntity(itemCatalogModel);
        invoiceService.saveItemCatalog(itemCatalog);
        return ResponseEntity.status(CREATED).body(new CreatedResponse(itemCatalog.getId()));
    }




    /**
     * Retrieves catalog item for selected id in invoice items
     * @param idItemCatalog the id of item in catalog of items
     * @return model object which represents catalog item
     */
    @Operation(description = "Puts new person to the database",
            method = "get",
            operationId = "getItemCatalog",
            responses = {
                    @ApiResponse(responseCode = "200",
                            description = "Retrieves catalog item for selected id in invoice items ",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0000 in case if somme error occurs ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Invoice",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    @GetMapping(value = PATH_ITEM_CATALOG+"/{idItemCatalog}", produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<ItemCatalogModel> getItemCatalog(
            @PathVariable() Long idItemCatalog){
        ItemCatalog itemCatalog = invoiceService.getItemCatalog(idItemCatalog);
        ItemCatalogModel itemCatalogModel = EntityToModelMapperHelper.mapEntityToItemCatalogModel(itemCatalog);
        return ResponseEntity.ok(itemCatalogModel);
    }

    /**
     * Search and retrieve the {@link InvoiceFormModel} by invoice number {@code invoiceNumber}
     * @param invoiceNumber  number of invoice
     * @return {@link InvoiceFormModel} and the successful status OK
     */
    public ResponseEntity<InvoiceFormModel> getInvoice(String invoiceNumber) {
        Invoice invoice = invoiceService.getInvoice(invoiceNumber);
        InvoiceFormModel invoiceFormModel = EntityToModelMapperHelper.mapInvoiceEntityToFormModel(invoice);

        return ResponseEntity.ok(invoiceFormModel);
    }



    /**
     *
     * @return the response with list of {@link DropdownDataType} with catalog items
     */
    @Operation(description = "Delivers the list of items from catalog of items for drop down in UI as key and value map where " +
            "key is ID of ItemCatalog and value is " +
            "concatenation of short description catalog item and price ",
            method = "get",
            operationId = "getCatalogItemsDropdown",
            responses = {
                    @ApiResponse(responseCode = "200",
                            description = "In case of successful delivering of DropdownDataType list transformed from" +
                                    " ItemCatalog",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0000 in case if somme error occurs ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Person",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    @RequestMapping(value = PATH_ITEMSCATALOG_DROPDOWN, method = RequestMethod.GET,
            produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<List<DropdownDataType>> getCatalogItemsDropdown() {
        List<ItemCatalog> allCatalogItems = invoiceService.getAllCatalogItems();
        List<DropdownDataType> dropdownDataTypes =
                EntityToModelMapperHelper.mapListCatalogItemsToDropdownType(allCatalogItems);
        return ResponseEntity.status(OK).body(dropdownDataTypes);
    }

    /**
     * @param principal injects by SpringBoot
     * @return the response with lists of {@link InvoiceFormModel}
     */
    @Operation(description = "Delivers the list of Invoices for table in UI for printing Invoices in PDF format ",
            method = "get",
            operationId = "getInvoices",
            responses = {
                    @ApiResponse(responseCode = "200",
                            description = "In case of successful delivering of invoices list ",
                            content = {@Content(
                                    mediaType = "application/json"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response with code CODE_0000 in case if somme error occurs ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "Invoice",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    @RequestMapping(value = PATH_INVOICES_LIST, method = RequestMethod.GET,
            produces = APPLICATION_JSON)
    public ResponseEntity<List<InvoiceFormModel>> getInvoices(Principal principal){

        List<Invoice> invoices = invoiceService.getAllUserInvoices(principal.getName());
        List<InvoiceFormModel> invoiceFormModels =
                invoices.stream().map(i ->
                        EntityToModelMapperHelper.mapInvoiceEntityToFormModel(i)).collect(Collectors.toList());
        return ResponseEntity.status(OK).body(invoiceFormModels);
    }


    @PostMapping(path = PATH_INVOICES_LIST_PERIOD, produces = APPLICATION_JSON, consumes = APPLICATION_JSON)
    public ResponseEntity<List<InvoiceFormModel>> getInvoicesByPeriod(Principal principal, @RequestBody RequestPeriodDate periodDate){

        List<Invoice> invoices = invoiceService.getAllUserInvoices(principal.getName(), periodDate);
        List<InvoiceFormModel> invoiceFormModels =
                invoices.stream().map(i ->
                        EntityToModelMapperHelper.mapInvoiceEntityToFormModel(i)).collect(Collectors.toList());
        return ResponseEntity.status(OK).body(invoiceFormModels);
    }

}
