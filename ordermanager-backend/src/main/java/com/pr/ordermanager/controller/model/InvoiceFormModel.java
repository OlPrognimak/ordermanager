package com.pr.ordermanager.controller.model;


import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.key.OffsetDateTimeKeyDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class InvoiceFormModel {

    private String invoiceNumber;
    private String invoiceDescription;
    private Long personSupplierId;
    private Long personRecipientId;
    private String supplierFullName;
    private String recipientFullName;
    private Double totalSumNetto;
    private Double totalSumBrutto;
    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
        timezone = "##default"
    )
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    @JsonDeserialize(keyUsing = OffsetDateTimeKeyDeserializer.class)
    private OffsetDateTime creationDate;


    @JsonFormat(
        shape = JsonFormat.Shape.STRING,
        pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
        timezone = "##default"
    )
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    @JsonDeserialize(keyUsing = OffsetDateTimeKeyDeserializer.class)
    private OffsetDateTime invoiceDate;
    private String rateType;

    private List<InvoiceItemModel>   invoiceItems;
}
