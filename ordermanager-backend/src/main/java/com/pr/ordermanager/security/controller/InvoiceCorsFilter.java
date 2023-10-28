/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package com.pr.ordermanager.security.controller;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.io.IOException;

/**
 * Cors filter for enabling cors requests. Currently, allows all re
 */
//@Component
//@Order(Ordered.HIGHEST_PRECEDENCE)
public class InvoiceCorsFilter extends CorsFilter {

	private static final Logger logger = LogManager
			.getLogger(InvoiceCorsFilter.class);

	public InvoiceCorsFilter() {
		super(new UrlBasedCorsConfigurationSource());
	}

	@Override
	public void destroy() {
	}


	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws IOException {

		try {
			filter(request, response, filterChain);
		} catch (ServletException e) {
			logger.error("CorsFilter Error", e);
		}

	}


	private void filter(ServletRequest req, ServletResponse res,
						FilterChain chain) throws IOException, ServletException {
		logger.info("CorsFilter: filter requested...");
		HttpServletResponse response = (HttpServletResponse) res;
		HttpServletRequest request = (HttpServletRequest) req;

		response.setHeader("Access-Control-Allow-Origin", "*");
		response.setHeader("Access-Control-Allow-Credentials","true");
		response.setHeader("Access-Control-Allow-Methods",
				"POST, GET, OPTIONS, DELETE, PUT, HEAD");

		response.setHeader("Access-Control-Max-Age", "360000");
//				response.setHeader("Access-Control-Allow-Headers","*");
		response.setHeader(
				"Access-Control-Allow-Headers",
				     					    "x-requested-with,"+
											"X-PINGOTHER,"+
				     					    "X-Auth-Token,"+
				     					    "x-gwt-permutation," +
											"x-gwt-module-base," +
											"Content-Type," +
											"X-Requested-With," +
											"Accept," +
											"Origin,"+
											"Referer,"+
											"User-Agent,"+
						 					"Access-Control-Request-Method," +
							 				"Access-Control-Request-Headers," +
											"Access-Control-Allow-Origin,"+
											"Access-Control-Allow-Methods,"+
							 				"Authorization," +
											"Access-Control-Max-Age,"+
											"X-HTTP-Method-Override,"+
											"user-password,"+
											"user-name,"+
											"Access-Control-Allow-Origin");
		chain.doFilter(request, response);
	}

}
