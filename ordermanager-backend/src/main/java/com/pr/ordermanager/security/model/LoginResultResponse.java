package com.pr.ordermanager.security.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Login result response
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginResultResponse {
    private boolean  logged;
    private String token;
}
