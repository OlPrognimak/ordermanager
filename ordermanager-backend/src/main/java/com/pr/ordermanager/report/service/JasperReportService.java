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
package com.pr.ordermanager.report.service;

import com.pr.ordermanager.exception.OrderManagerException;
import jakarta.annotation.PostConstruct;
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
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import static com.pr.ordermanager.exception.ErrorCode.CODE_10001;
import static com.pr.ordermanager.exception.ErrorCode.CODE_10002;

/**
 * @author  Oleksandr Prognimak
 */
@Service
public class JasperReportService {
    private static final Logger logger = LogManager.getLogger();
    @Autowired
    private DataSource dataSource;

    @Value("${jasper.reports.directory.path:reports}")
    private String jasperRepDirPath;

    @Autowired
    private Environment env;

    private JasperReport jasperReport;

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
        System.out.println("Path to dir:" + jasperRepDirPath);
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
