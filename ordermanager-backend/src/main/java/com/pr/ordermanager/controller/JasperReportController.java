package com.pr.ordermanager.controller;

import com.pr.ordermanager.service.JasperReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
public class JasperReportController {

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

        byte[] report = jasperReportService.createPdfReport(invoiceNumber);

        HttpHeaders header = new HttpHeaders();
        header.setContentType(MediaType.APPLICATION_PDF);
        header.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=" + "invoice_"+invoiceNumber+".pdf");
        header.setContentLength(report.length);

        return new HttpEntity<byte[]>(report, header);

    }


}
