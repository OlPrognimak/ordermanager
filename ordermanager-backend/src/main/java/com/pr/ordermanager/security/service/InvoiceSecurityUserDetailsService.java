package com.pr.ordermanager.security.service;

import com.pr.ordermanager.security.entity.InvoiceUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * @author Oleksandr Prognimak
 * @created 22.09.2020 - 19:51
 */
@Service
public class InvoiceSecurityUserDetailsService implements UserDetailsService {
    @Autowired
    UserService userService;

    /**
     *
     * @param userName the user name to be authenticated
     * @return the user details
     * @throws UsernameNotFoundException if user in the database is not found
     */
    @Override
    public UserDetails loadUserByUsername(String userName) throws UsernameNotFoundException {
        InvoiceUser user = userService.getUserOrException(userName);
        if(null == user){
            throw new UsernameNotFoundException("The user with name " + userName + "] does not exist");
        }
        return new InvoiceSecurityUserDetails(user);
    }
}
