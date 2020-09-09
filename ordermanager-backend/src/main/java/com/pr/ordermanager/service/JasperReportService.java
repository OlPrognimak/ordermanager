package com.pr.ordermanager.service;

import com.pr.ordermanager.exception.OrderManagerException;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimplePdfExporterConfiguration;
import net.sf.jasperreports.export.SimplePdfReportConfiguration;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

import static com.pr.ordermanager.exception.ErrorCode.CODE_10001;
import static com.pr.ordermanager.exception.ErrorCode.CODE_10002;

@Service
public class JasperReportService {
    private static final Logger logger = LogManager.getLogger();
    @Autowired
    DataSource dataSource;
    @Value("${jasper.reports.directory.path}")
    private String jasperRepDirPath;
    JasperReport jasperReport;

    @PostConstruct
    public void initService(){
        ClassPathResource classPathResource = new ClassPathResource("/invoice.jrxml") ;
        InputStream invoiceReportStream = null;
        try {
            invoiceReportStream = classPathResource.getInputStream();
            jasperReport= JasperCompileManager.compileReport(invoiceReportStream);
        } catch (IOException e) {
            logger.error(e);
        } catch(JRException e){
            logger.error(e);
        }

    }

    /**
     * Creates configurable pdf report for invoice with number {@code invoiceNumber}
     * @param invoiceNumber tne number of invoice
     * @return the pdf report as array of bytes
     */
    public byte[] createPdfReport(String invoiceNumber)  {
        System.out.println("Path to dir:"+jasperRepDirPath);
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("invoiceNumber", invoiceNumber);
        parameters.put("reportsDirPath", jasperRepDirPath);

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
        } catch (JRException ex) {
            logger.error(ex);
            throw new OrderManagerException(CODE_10001,
                    "Report generation exception in service method createPdfReport");
        }catch( SQLException ex) {
            logger.error(ex);
            throw new OrderManagerException(CODE_10002,
                    "Can not read data from database in service method createPdfReport");
        }

    }

    /**
     * Creates non configurable pdf report for invoice with number {@code invoiceNumber}
     * @param invoiceNumber tne number of invoice
     * @return the pdf report as array of bytes
     */
    public byte[] createPdfReport2(String invoiceNumber) {

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("invoiceNumber", invoiceNumber);
        parameters.put("reportsDirPath", jasperRepDirPath);
        try {
            JasperPrint objJPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource.getConnection());
            ByteArrayOutputStream objBAOutputStream = new ByteArrayOutputStream();
            JasperExportManager.exportReportToPdfStream(objJPrint, objBAOutputStream);
            return  objBAOutputStream.toByteArray();
        } catch (JRException ex) {
            throw new OrderManagerException(CODE_10001,
                    "Report generation exception in service method createPdfReport");
        } catch (SQLException ex) {
            throw new OrderManagerException(CODE_10002,
                    "Can not read data from database in service method createPdfReport");
        }
    }

}
