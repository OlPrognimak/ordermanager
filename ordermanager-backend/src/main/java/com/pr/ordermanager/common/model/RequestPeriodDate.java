package com.pr.ordermanager.common.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
@Builder
public class RequestPeriodDate {
    @JsonFormat(
            shape = JsonFormat.Shape.STRING,
            pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            timezone = "##default"
    )
    private OffsetDateTime startDate;
    @JsonFormat(
            shape = JsonFormat.Shape.STRING,
            pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            timezone = "##default"
    )
    private OffsetDateTime endDate;
}
