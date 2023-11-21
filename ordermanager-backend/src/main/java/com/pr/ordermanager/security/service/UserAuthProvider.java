package com.pr.ordermanager.security.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.pr.ordermanager.security.entity.InvoiceUser;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;


/**
 * The auth provider with JWT Token
 */
@RequiredArgsConstructor
@Component
public class UserAuthProvider {
    private static final Logger logger = LogManager.getLogger(UserAuthProvider.class.getSimpleName());

    @Value("${app.ordermanager.security.auth-key:auth-key}")
    private String authKey;


    @PostConstruct
    protected void init() {
        authKey = Base64.getEncoder().encodeToString(authKey.getBytes());
    }

    /**
     * Creates JWT Token from from user object.
     *
     * @param user the connected user
     * @return the token
     */
    public String createToken(InvoiceUser user) {
        Date currDate = new Date();
        Date validUntill = new Date(currDate.getTime()+1_800_000);
        return JWT.create()
                .withIssuer(user.getUsername())
                .withIssuedAt(currDate)
                .withExpiresAt(validUntill)
                .withClaim("role", user.getAuthorities().stream().map(r -> r.getAuthority()).collect(Collectors.joining(",")))
                .sign(Algorithm.HMAC256(authKey));
    }

    /**
     * Validate JWT token.
     *
     * @param token the token to be validate
     * @return the authentication or Exception
     */
    public Authentication validateToken(String token) {
        Algorithm algorithm = Algorithm.HMAC256(authKey);

        JWTVerifier verifier = JWT.require(algorithm).build();
        DecodedJWT decodedJWT = verifier.verify(token);
        InvoiceUser invoiceUser = InvoiceUser.builder()
                .username(decodedJWT.getIssuer())
                .roles(decodedJWT.getClaim("role").asString())
                .build();

        Stream<String> rolesStream = Stream.of(decodedJWT.getClaim("role").asString());
        List<GrantedAuthority> rolesList =rolesStream.collect(Collectors.mapping( a-> new UserGrantedAuthority(a), Collectors.toList()));
        //logger.info("USER ROLE :"+decodedJWT.getClaim("role").asString());
        return new UsernamePasswordAuthenticationToken(invoiceUser, null, rolesList);
    }

}

/**
 * The granted authority or Role
 */
class UserGrantedAuthority implements GrantedAuthority {

    private String authority;
    UserGrantedAuthority(String authority) {
        this.authority = authority;
    }

    @Override
    public String getAuthority() {
        return null;
    }
}
