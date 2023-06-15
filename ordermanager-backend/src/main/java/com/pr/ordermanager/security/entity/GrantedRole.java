package com.pr.ordermanager.security.entity;

import com.pr.ordermanager.common.entity.AbstractEntity;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;

import jakarta.persistence.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@SequenceGenerator(name ="role_seq_gen",sequenceName="role_seq", initialValue=1, allocationSize=10)
public class GrantedRole extends AbstractEntity implements GrantedAuthority {

    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="role_seq_gen")
    private Long id;
    private String authority;

    @Transient
    private String getRole() {
        return authority;
    }
}
