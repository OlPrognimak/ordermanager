package com.pr.ordermanager.report.model;

import lombok.Builder;
import lombok.Data;

import java.util.Date;
import java.util.List;


@Data
@Builder
public class InvoiceReportModel {
    private String supplierFirstName;
	private String supplierLastName;
	private String supplierCompanyName;
	private String supplierCity;
	private String supplierStreet;
	private String supplierZipCode;
	private String supplierTaxNumber;
	private String supplierPostBoxCode;
	private String supplierAccountNumber;
	private String supplierBankName;
	private String supplierBicSwift;
	private String supplierIban;
	private String recipientFirstName;
	private String recipientLastName;
	private String recipientCompanyName;
	private String recipientCity;
	private String recipientStreet;
	private String recipientZipCode;
	private String recipientPostBoxCode;
	private String personType;
	private Date creationDate;
	private Date invoiceDate;
	private String invoiceNumber;
	private Long invoiceId;
	private String invoiceDescription;
	private String rateType;
	private Double totalSumNetto;
	private Double totalSunBrutto;

	private List<InvoiceReportItem> items;
}
