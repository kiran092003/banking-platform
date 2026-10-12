package com.banking_payment_platform.api_gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/swagger")
public class OpenApiProxyController {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    /*
     * Upstream /v3/api-docs hosts, and the public gateway URL stamped into each
     * spec's `servers` entry. Externalised because the service hostnames differ
     * between a local run (localhost) and Compose (container names), while the
     * gateway URL has to be whatever the browser can actually reach.
     */
    private final String authUrl;
    private final String accountUrl;
    private final String transactionUrl;
    private final String gatewayUrl;

    public OpenApiProxyController(
            @Value("${springdoc.proxy.auth-url:http://localhost:8081}")
            String authUrl,

            @Value("${springdoc.proxy.account-url:http://localhost:8082}")
            String accountUrl,

            @Value("${springdoc.proxy.transaction-url:http://localhost:8083}")
            String transactionUrl,

            @Value("${springdoc.proxy.gateway-url:http://localhost:8080}")
            String gatewayUrl
    ) {
        this.restClient = RestClient.builder().build();
        this.objectMapper = new ObjectMapper();

        this.authUrl = authUrl;
        this.accountUrl = accountUrl;
        this.transactionUrl = transactionUrl;
        this.gatewayUrl = gatewayUrl;
    }

    @GetMapping(
            value = "/auth-api-docs",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> authApiDocs() {
        return getOpenApiSpec(
                authUrl + "/v3/api-docs",
                gatewayUrl + "/auth"
        );
    }

    @GetMapping(
            value = "/account-api-docs",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> accountApiDocs() {
        return getOpenApiSpec(
                accountUrl + "/v3/api-docs",
                gatewayUrl + "/account"
        );
    }

    @GetMapping(
            value = "/transaction-api-docs",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> transactionApiDocs() {
        return getOpenApiSpec(
                transactionUrl + "/v3/api-docs",
                gatewayUrl + "/transaction"
        );
    }

    private ResponseEntity<String> getOpenApiSpec(
            String serviceUrl,
            String gatewayUrl) {

        String response = restClient.get()
                .uri(serviceUrl)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(response);

            ArrayNode servers = objectMapper.createArrayNode();

            ObjectNode server = objectMapper.createObjectNode();
            server.put("url", gatewayUrl);
            server.put("description", "API Gateway");

            servers.add(server);

            ((ObjectNode) root).set("servers", servers);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(root));

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to process OpenAPI specification",
                    e
            );
        }
    }
}