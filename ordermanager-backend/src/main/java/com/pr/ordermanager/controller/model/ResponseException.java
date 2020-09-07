package com.pr.ordermanager.controller.model;

import com.pr.ordermanager.exception.ErrorCode;
import lombok.*;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class ResponseException {
    private String shortText;
    private String errorMessage;
    private ErrorCode errorCode;
}
