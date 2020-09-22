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
    /**
     *
     * @param userName the name of user
     * @param password the password of user
     */
     public InvoiceUser(String userName, String password){
         this.userName =userName;
         this.userPassword = password;
     }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userName;
    private String userPassword;
    private String roles;
}
