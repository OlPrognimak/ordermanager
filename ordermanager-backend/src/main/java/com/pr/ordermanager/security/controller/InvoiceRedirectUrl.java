package com.pr.ordermanager.security.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.DefaultRedirectStrategy;

import java.io.IOException;

public class InvoiceRedirectUrl extends DefaultRedirectStrategy {

    private final String contextUrl;

    public InvoiceRedirectUrl(String contextUrl) {
        this.contextUrl = contextUrl;
    }

    @Override
    public void sendRedirect(HttpServletRequest request, HttpServletResponse response, String url) throws IOException {

        response.getOutputStream().write("{\"logged\": true}".getBytes());
        response.flushBuffer();
//        String redirectUrl = calculateRedirectUrl(request.getContextPath(), url);
//        redirectUrl = response.encodeRedirectURL(redirectUrl);
//        if (this.logger.isDebugEnabled()) {
//            this.logger.debug(LogMessage.format("Redirecting to %s", redirectUrl));
//        }
//        response.sendRedirect(redirectUrl);
    }


//    protected String calculateRedirectUrl(String contextPath, String url) {
//        return super.calculateRedirectUrl(contextUrl, url);
//    }
}
