package com.pr.ordermanager.security.controller;

import com.pr.ordermanager.exception.ErrorCode;
import com.pr.ordermanager.exception.OrderManagerException;
import com.pr.ordermanager.security.service.UserAuthProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * The JWT filter
 */
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final UserAuthProvider userAuthProvider;
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if(header !=null) {
            String[] headerParts = header.split(" ");
            if( (headerParts.length == 2 && "Bearer".equals(headerParts[0]))) {
                try {
                    SecurityContextHolder.getContext().setAuthentication(userAuthProvider.validateToken(headerParts[1]));
                }catch (RuntimeException ex) {
                    SecurityContextHolder.getContext();
                    throw new OrderManagerException(ErrorCode.CODE_20100, "Token invalid.", ex);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
