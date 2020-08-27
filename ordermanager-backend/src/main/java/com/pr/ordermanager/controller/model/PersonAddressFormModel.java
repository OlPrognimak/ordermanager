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
public class PersonAddressFormModel {

    private Long id;
    private String city;
    private String street;
    private String zipCode;
    private String postBoxCode;
}
