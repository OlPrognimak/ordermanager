package com.pr.ordermanager.security.entity;

import com.pr.ordermanager.common.entity.AbstractEntity;
import lombok.*;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

/**
 * @author Oleksandr Prognimak
 * @since 21.09.2020 - 21:50
 */
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Entity
public class InvoiceUser extends AbstractEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userName;
    private String roles;
}
