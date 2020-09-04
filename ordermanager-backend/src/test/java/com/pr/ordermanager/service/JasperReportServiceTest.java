package com.pr.ordermanager.service;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.File;
import java.io.FileOutputStream;

import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JasperReportServiceTest {

    @Autowired
    JasperReportService jasperReportService;

    @Test
    void printReport() throws Exception{
       byte[] report = jasperReportService.createPdfReport("1111");
        Assertions.assertNotNull(report);
        Assertions.assertTrue(report.length>0);
        System.out.println("Array Size = "+report.length);
        File f = new File("D:\\tmp\\test.pdf");
        FileOutputStream out = new FileOutputStream(f);
        out.write(report);
        out.flush();
        out.close();

    }
}