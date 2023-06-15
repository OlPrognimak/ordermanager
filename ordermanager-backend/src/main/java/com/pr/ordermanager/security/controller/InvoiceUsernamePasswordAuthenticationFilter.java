package com.pr.ordermanager.security.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Base64;

public class InvoiceUsernamePasswordAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private static final int USER_NAME_INDEX = 0;
    private static final int PASSWORD_INDEX = 1;

    public InvoiceUsernamePasswordAuthenticationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
    }

    @Override
    protected String obtainUsername(HttpServletRequest request) {
        return getUserOrPassword(request, USER_NAME_INDEX);
    }

    @Override
    protected String obtainPassword(HttpServletRequest request) {
        return getUserOrPassword(request, PASSWORD_INDEX);
    }

    private String getUserOrPassword(HttpServletRequest request, int index) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if(auth != null) {
            String loginHeader = auth.trim().substring(6) ;
            String decodedLoginHeader = new String(Base64.getDecoder().decode(loginHeader));
            String[] item = decodedLoginHeader.split(":");
            if(item !=null && item.length == 2) {
                return  item[index];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

}
