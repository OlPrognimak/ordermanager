package com.pr.ordermanager.security.service;

import com.pr.ordermanager.security.entity.InvoiceUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * @author Oleksandr Prognimak
 * @created 22.09.2020 - 19:45
 */
public class InvoiceSecurityUserDetails  extends InvoiceUser implements UserDetails {
    /**
     * The user which ned to be authenticated
     * @param user
     */
    public InvoiceSecurityUserDetails(InvoiceUser user){
        super(user.getUserName(), user.getUserPassword());
    }


    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return AuthorityUtils.createAuthorityList("ROLE_INVOICE","ROLE_PERSON", "ROLE_INVOICE_PERSON");
    }

    @Override
    public String getPassword() {
        return super.getUserPassword();
    }

    @Override
    public String getUsername() {
        return super.getUserName();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
