package com.pr.ordermanager.controller.model;

import lombok.*;

import javax.persistence.Entity;

@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class DropdownDataType {
    private String label;
    private String value;
}
