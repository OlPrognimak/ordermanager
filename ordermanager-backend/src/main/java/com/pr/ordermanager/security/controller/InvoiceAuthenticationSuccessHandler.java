package com.pr.ordermanager.security.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.log.LogMessage;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;

import java.io.IOException;

public class InvoiceAuthenticationSuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final String targetUrl;
    private final RedirectStrategy redirectStrategy;


    public InvoiceAuthenticationSuccessHandler(String targetUrl, RedirectStrategy redirectStrategy) {
        this.targetUrl = targetUrl;
        this.redirectStrategy = redirectStrategy;
    }


    @Override
    protected void handle(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        String targetUrl = determineTargetUrl(request, response, authentication);
        if (response.isCommitted()) {
            this.logger.debug(LogMessage.format("Did not redirect to %s since response already committed.", targetUrl));
            return;
        }
        this.redirectStrategy.sendRedirect(request, response, targetUrl);
    }

}
