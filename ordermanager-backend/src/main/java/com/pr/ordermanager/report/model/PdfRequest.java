package com.pr.ordermanager.report.model;

import lombok.Data;

/**
 * @author Oleksandr Prognimak
 * @since 07.10.2020 - 19:57
 */
@Data
public class PdfRequest {
    private String invoiceNumber;
    private String language;
}
