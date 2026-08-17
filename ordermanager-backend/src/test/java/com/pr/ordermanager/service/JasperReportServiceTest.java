package com.pr.ordermanager.service;

import com.pr.ordermanager.report.service.JasperReportService;
import liquibase.integration.spring.SpringResourceAccessor;
import net.sf.jasperreports.engine.util.JRLoader;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.File;
import java.io.FileOutputStream;
import java.net.URL;

//@ExtendWith(SpringExtension.class)
//@DataJpaTest
//@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
//@Disabled
@SpringBootTest()
class JasperReportServiceTest {
    Logger logger = LogManager.getLogger(JasperReportServiceTest.class);
    @Autowired
    JasperReportService jasperReportService;
    @Autowired
    ResourceLoader resourceLoader;


    @Disabled("Configure output file for pdf output")
    @Test
    void printReport() throws Exception {
        byte[] report = jasperReportService.createPdfReport("423423efdfsdfsd", "test", "DE");
        Assertions.assertNotNull(report);
        Assertions.assertTrue(report.length > 0);
        logger.debug("Report Size: "+report.length);
        //File f = new File("D:\\tmp\\test.pdf");
        File f = new File("/Users/alexadmin/Desktop/work/test.pdf");

        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(report);
            out.flush();

        }

    }


    @Disabled
    @Test
    void testInputStream() throws Exception {
        //ObjectInputStream objectInputStream = new ObjectInputStream(getClass().getResourceAsStream("/invoice-items.jasper"));
        SpringResourceAccessor accessor = new SpringResourceAccessor(resourceLoader);
        URL resource = JasperReportServiceTest.class.getResource("/invoice-data.jasper");

        Assertions.assertNotNull(resource);
        //Assertions.assertNotNull(resource.openStream());
        // ObjectInputStream objectInputStream = new ObjectInputStream(resource.openStream());
        //Assertions.assertNotNull(objectInputStream);
        String pathFile = resource.getFile();
        logger.debug("++++++++++++++++++++++++PATH = " + pathFile);
        System.out.println("++++++++++++++++++++++++PATH-2 = " + pathFile);
        Object object = JRLoader.loadObject(new File(resource.getFile()));
        Assertions.assertNotNull(object);

    }
}