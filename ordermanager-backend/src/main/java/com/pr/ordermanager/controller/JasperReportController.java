package com.pr.ordermanager.controller;

import com.pr.ordermanager.service.JasperReportService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
public class JasperReportController {
    Logger logger = LogManager.getLogger(InvoiceController.class);

    @Autowired
    JasperReportService jasperReportService;



    public void initController(){

    }
    /**
     *
     * @param invoiceNumber
     */
    @GetMapping("/invoice/report/{invoiceNumber}")
    @ResponseBody
    public HttpEntity<byte[]> printReport(@PathVariable String invoiceNumber)  {
        logger.debug("invoiceNumber: "+invoiceNumber);
        byte[] report = jasperReportService.createPdfReport(invoiceNumber);
        logger.debug("Report size: "+report.length);
        HttpHeaders header = new HttpHeaders();
        header.setContentType(MediaType.APPLICATION_PDF);
        header.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=" + "invoice_"+invoiceNumber+".pdf");
        header.setContentLength(report.length);
        logger.debug("Response created");
        return new HttpEntity<byte[]>(report, header);

    }


}
