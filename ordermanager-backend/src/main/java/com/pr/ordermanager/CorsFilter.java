package com.pr.ordermanager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class CorsFilter implements Filter {

	private static final Logger logger = LoggerFactory
			.getLogger(CorsFilter.class);

	@Override
	public void destroy() {
	}

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {
		logger.debug("CorsFilter init...");
	}

	@Override
	public void doFilter(ServletRequest req, ServletResponse res,
			FilterChain chain) throws IOException, ServletException {
		logger.debug("CorsFilter started...");
		HttpServletResponse response = (HttpServletResponse) res;

		response.setHeader("Access-Control-Allow-Origin", "*");
		response.setHeader("Access-Control-Allow-Methods",
				"POST, GET, OPTIONS, DELETE, PUT, HEAD");
		response.setHeader("Access-Control-Max-Age", "3600");
		response.setHeader(
				"Access-Control-Allow-Headers",
				"x-gwt-permutation, x-gwt-module-base, Content-Type, X-Requested-With, Accept, Origin,"
						+ "Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, X-HTTP-Method-Override");
		chain.doFilter(req, res);
	}

}
