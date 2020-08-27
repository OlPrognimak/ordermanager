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
public class PersonFormModel {
    private Long id;
    private String personLastName;
    private String personFirstName;
    private String companyName;
    private String personType;
    private String taxNumber;
    private PersonAddressFormModel personAddressFormModel;
    private BankAccountFormModel bankAccountFormModel;

}
