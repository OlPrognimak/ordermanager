package com.pr.ordermanager.security.service;

import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.security.entity.GrantedRole;
import com.pr.ordermanager.security.entity.InvoiceUser;
import com.pr.ordermanager.security.repository.RoleRepository;
import com.pr.ordermanager.security.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.provisioning.UserDetailsManager;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

import java.util.Objects;

import static com.pr.ordermanager.exception.ErrorCode.CODE_0008;

@Service
@AllArgsConstructor
@Log4j2
@Transactional
public class InvoiceUserDetailsManager implements UserDetailsManager, UserDetailsPasswordService {


    private final UserRepository userRepository;
    private static final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();
    private final AuthenticationManagerBuilder auth;
    private final RoleRepository roleRepository;
//    @Autowired
//    private  AuthenticationManager authenticationManager;

    @PostConstruct
    public void initBean() throws Exception {
        if(roleRepository.findByAuthority("ROLE_USER") == null){
            roleRepository.save(GrantedRole.builder().authority("ROLE_USER").build());
        }
        //TODO
        //authenticationManager = auth.build();
    }


    @Override
    public UserDetails updatePassword(UserDetails user, String newPassword) {
        Objects.requireNonNull(user, "The user object can not be null");
        StringUtils.isNotBlank(newPassword);
        InvoiceUser existedUser = userRepository.findByUsername(user.getUsername());
        existedUser.setPassword(newPassword);
        return existedUser;
    }

    @Override
    public void createUser(UserDetails user) {
        Assert.notNull(user, "User details can not be null");
        InvoiceUser existedUser = userRepository.findByUsername(user.getUsername());
        if(existedUser==null) {
            userRepository.save((InvoiceUser) user);
        }else{
            throw new OrderManagerException(CODE_0008,"The user with name: ["+user.getUsername()+"] already exists");
        }
    }

    @Override
    public void updateUser(UserDetails user) {
        InvoiceUser existedUser = userRepository.findByUsername(user.getUsername());
        existedUser.setUsername(user.getUsername());
        existedUser.setPassword(user.getPassword());
    }

    @Override
    public void deleteUser(String username) {
        StringUtils.isNotBlank(username);
        InvoiceUser existedUser = userRepository.findByUsername(username);
        userRepository.delete(existedUser);
    }

    @Override
    public void changePassword(String oldPassword, String newPassword) {
        StringUtils.isNotBlank(oldPassword);
        StringUtils.isNotBlank(newPassword);
        Authentication currentUser = securityContextHolderStrategy.getContext().getAuthentication();
//        if (currentUser == null) {
//            throw new AccessDeniedException("Can't change password as no Authentication object found in context for current user.");
//        } else {
//            String username = currentUser.getName();
//            if (this.authenticationManager != null) {
//                log.debug(LogMessage.format("Reauthenticating user '%s' for password change request.", username));
//                this.authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(username, oldPassword));
//            } else {
//                this.log.debug("No authentication manager set. Password won't be re-checked.");
//            }
//
//            this.log.debug("Changing password for user '" + username + "'");
//            InvoiceUser existedUser = userRepository.findByUsername(username);
//            existedUser.setPassword(newPassword);
//
//            Authentication authentication = this.createNewAuthentication(currentUser);
//            SecurityContext context = this.securityContextHolderStrategy.createEmptyContext();
//            context.setAuthentication(authentication);
//            this.securityContextHolderStrategy.setContext(context);
//        }
    }

    @Override
    public boolean userExists(String username) {
        return userRepository.findByUsername(username) != null;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            return new InvoiceSecurityUserDetails(userRepository.findByUsername(username));
        } catch (Exception e) {
            throw new UsernameNotFoundException(e.getMessage(), e);
        }
    }

    private Authentication createNewAuthentication(Authentication currentAuth) {
        UserDetails user = this.loadUserByUsername(currentAuth.getName());
        UsernamePasswordAuthenticationToken newAuthentication = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
        newAuthentication.setDetails(currentAuth.getDetails());
        return newAuthentication;
    }
}
