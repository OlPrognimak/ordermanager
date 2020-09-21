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
package com.pr.ordermanager.report.controller;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.invoice.controller.InvoiceController;
import com.pr.ordermanager.report.service.JasperReportService;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/**
 * The rest controller for generation pdf report
 *
 * @author Oleksandr Prognimak
 */
@OpenAPIDefinition(
        info = @Info(
                title = "This controller contains the end points for generation of invoices in PDF format and  using" +
                        "jasper report for that",
                contact = @Contact(url = "", name = "Oleksandr Prognimak", email = "ol.prognimak@gmai.com")
        )
)
@RestController
@CrossOrigin
public class JasperReportController {
    Logger logger = LogManager.getLogger(InvoiceController.class);

    @Autowired
    JasperReportService jasperReportService;

    /**
     * Produce pdf report from report data in database for report which is
     * defined by {@code invoiceNumber}
     *
     * @param invoiceNumber the number of invoice
     * @return the response with pdf report
     */
    @Operation(description = "Produces invoice in pdf format",
            method = "get",
            operationId = "printReport",
            responses = {
                    @ApiResponse(responseCode = "200",
                            description = "delivers invoice in pdf format as byte array",
                            content = {@Content(
                                    mediaType = "application/pdf"
                            )}
                    ),
                    @ApiResponse(responseCode = "400",
                            description = "response in case if exception in database or in the " +
                                    "generation of pdf report occurs ",
                            content = {@Content(
                                    mediaType = "application/json",
                                    schema = @Schema(
                                            implementation = OrderManagerException.class
                                    )
                            )}
                    )
            },
            tags = "JasperReport",
            security = {@SecurityRequirement(
                    name = "basicAuth"
            )}
    )
    @GetMapping(value = "/invoice/report/{invoiceNumber}")
    @ResponseBody
    public HttpEntity<byte[]> printReport(@Parameter(description = "the number of invoice")
                                              @PathVariable String invoiceNumber) {
        logger.debug("invoiceNumber: " + invoiceNumber);
        byte[] report = jasperReportService.createPdfReport(invoiceNumber);
        logger.debug("Report size: " + report.length);
        HttpHeaders header = new HttpHeaders();
        header.setContentType(MediaType.APPLICATION_PDF);
        header.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=" + "invoice_" + invoiceNumber + ".pdf");
        header.setContentLength(report.length);
        logger.debug("Response created");
        return new HttpEntity<byte[]>(report, header);

    }
}
