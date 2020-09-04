package com.pr.ordermanager.service;

import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimplePdfExporterConfiguration;
import net.sf.jasperreports.export.SimplePdfReportConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@Service
public class JasperReportService {

    @Autowired
    DataSource dataSource;

    JasperReport jasperReport;

    @PostConstruct
    public void initService(){
        ClassPathResource classPathResource = new ClassPathResource("/invoice.jrxml") ;
        InputStream invoiceReportStream = null;
        try {
            invoiceReportStream = classPathResource.getInputStream();
            jasperReport= JasperCompileManager.compileReport(invoiceReportStream);
        } catch (IOException e) {
            e.printStackTrace();
        } catch(JRException e){
            e.printStackTrace();
        }

    }

    /**
     * Creates pdf report for invoice with number {@code invoiceNumber}
     * @param invoiceNumber tne number of invoice
     * @return the pdf report as array of bytes
     */
    public byte[] createPdfReport(String invoiceNumber)  {

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("invoiceNumber", invoiceNumber);
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        try {
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource.getConnection());
            JRPdfExporter exporter = new JRPdfExporter();

            SimpleOutputStreamExporterOutput exporterOutput =
                    new SimpleOutputStreamExporterOutput(byteArrayOutputStream);
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(exporterOutput);
            //report configuration
            SimplePdfReportConfiguration reportConfig
                    = new SimplePdfReportConfiguration();
            reportConfig.setSizePageToContent(true);
            reportConfig.setForceLineBreakPolicy(false);
            //export configuration
            SimplePdfExporterConfiguration exportConfig
                    = new SimplePdfExporterConfiguration();
            exportConfig.setMetadataAuthor("Prognimak");
            exportConfig.setEncrypted(true);
            exportConfig.setAllowedPermissionsHint("PRINTING");

            exporter.setConfiguration(reportConfig);
            exporter.setConfiguration(exportConfig);
            //
            exporter.exportReport();

            return byteArrayOutputStream.toByteArray();
        } catch (JRException | SQLException e) {
            e.printStackTrace();
        }
//        catch (IOException e){
//            e.printStackTrace();
//        }

        return null;
    }

}
