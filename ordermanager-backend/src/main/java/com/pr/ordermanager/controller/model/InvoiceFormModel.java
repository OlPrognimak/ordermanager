package com.pr.ordermanager.controller.model;


import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.key.OffsetDateTimeKeyDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class InvoiceFormModel {


    private String personSurname;

    private String personFirstName;

    private String personType;

    private String invoiceNumber;

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
