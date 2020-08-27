package com.pr.ordermanager.controller.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class BankAccountFormModel {
    private Long id;
    private String accountNumber;
    private String iban;
    private String bicSwift;
    private String bankName;
}
