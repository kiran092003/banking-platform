package com.banking_payment_platform.api_gateway.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.function.Function;

@Service
public class JWTService {

    @Value("${jwt.secret}")
    private String secretKey;

    private SecretKey getKey() {

        byte[] keyBytes =
                Decoders.BASE64.decode(secretKey);

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {

        return extractClaim(token, Claims::getSubject);
    }

    /**
     * The userId claim, used when minting a WebSocket ticket so the stream is
     * bound to the authenticated user rather than to anything client-supplied.
     *
     * @return the userId, or null if the token is unreadable
     */
    public Long extractUserId(String token) {

        try {
            return extractClaim(
                    token,
                    claims -> claims.get("userId", Long.class)
            );
        } catch (Exception exception) {
            return null;
        }
    }

    private <T> T extractClaim(
            String token,
            Function<Claims, T> claimResolver) {

        Claims claims = Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claimResolver.apply(claims);
    }

    public boolean validateToken(String token) {

        try {

            Claims claims = Jwts.parser()
                    .verifyWith(getKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return claims.getExpiration()
                    .after(new java.util.Date());

        } catch (Exception e) {

            return false;
        }
    }
}