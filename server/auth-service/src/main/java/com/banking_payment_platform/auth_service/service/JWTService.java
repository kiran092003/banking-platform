package com.banking_payment_platform.auth_service.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Service
public class JWTService {

    @Value("${jwt.secret}")
    private String secretkey;


    // =========================
    // ACCESS TOKEN
    // =========================

    public String generateAccessToken(
            UserDetails userDetails,
            Long userId,
            String role
    ) {

        return Jwts.builder()
                .subject(userDetails.getUsername())

                // User ID
                .claim("userId", userId)

                // User Role
                .claim("role", role)

                .issuedAt(new Date())

                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + 15 * 60 * 1000
                        )
                )

                .signWith(getKey())
                .compact();
    }


    // =========================
    // REFRESH TOKEN
    // =========================

    public String generateRefreshToken(String username) {

        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + 7L * 24 * 60 * 60 * 1000
                        )
                )
                .signWith(getKey())
                .compact();
    }


    // =========================
    // SECRET KEY
    // =========================

    private SecretKey getKey() {

        byte[] keyBytes =
                Decoders.BASE64.decode(secretkey);

        return Keys.hmacShaKeyFor(keyBytes);
    }


    // =========================
    // EXTRACT USERNAME
    // =========================

    public String extractUserName(String token) {

        return extractClaim(
                token,
                Claims::getSubject
        );
    }


    // =========================
    // EXTRACT USER ID
    // =========================

    public Long extractUserId(String token) {

        return extractClaim(
                token,
                claims -> claims.get("userId", Long.class)
        );
    }


    // =========================
    // EXTRACT ROLE
    // =========================

    public String extractRole(String token) {

        return extractClaim(
                token,
                claims -> claims.get("role", String.class)
        );
    }


    // =========================
    // GENERIC CLAIM EXTRACTION
    // =========================

    private <T> T extractClaim(
            String token,
            Function<Claims, T> claimResolver
    ) {

        final Claims claims =
                extractAllClaims(token);

        return claimResolver.apply(claims);
    }


    // =========================
    // EXTRACT ALL CLAIMS
    // =========================

    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }


    // =========================
    // VALIDATE TOKEN
    // =========================

    public boolean validateToken(
            String token,
            UserDetails userDetails
    ) {

        final String userName =
                extractUserName(token);

        return userName.equals(
                userDetails.getUsername()
        )
                && !isTokenExpired(token);
    }


    // =========================
    // CHECK EXPIRATION
    // =========================

    private boolean isTokenExpired(String token) {

        return extractExpiration(token)
                .before(new Date());
    }


    private Date extractExpiration(String token) {

        return extractClaim(
                token,
                Claims::getExpiration
        );
    }
}
