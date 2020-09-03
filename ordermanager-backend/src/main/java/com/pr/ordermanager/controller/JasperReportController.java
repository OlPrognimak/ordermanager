package com.pr.ordermanager.controller;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
public class JasperReportController {




    public void initController(){

    }
    /**
     *
     * @param invoiceNumber
     */
    @GetMapping("/invoice/report/{invoiceNumber}")
    @ResponseBody
    public Resource printReport(@PathVariable String invoiceNumber)  {

        HttpHeaders header = new HttpHeaders();
        header.setContentType(MediaType.APPLICATION_PDF);
        header.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=" + "invoice_"+invoiceNumber+".pdf");

        //header.setContentLength(document.length());
        return null;


    }
}
