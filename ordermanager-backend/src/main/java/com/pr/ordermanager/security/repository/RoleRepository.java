package com.pr.ordermanager.security.repository;

import com.pr.ordermanager.security.entity.GrantedRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<GrantedRole, Long> {
    GrantedRole findByAuthority(String authority);
}
