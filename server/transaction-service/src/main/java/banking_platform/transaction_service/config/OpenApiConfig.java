package banking_platform.transaction_service.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI transactionServiceOpenAPI() {

        return new OpenAPI()
                .info(
                        new Info()
                                .title("Banking Platform - Transaction Service API")
                                .description(
                                        "Transaction creation, transaction lookup, " +
                                                "and transaction history APIs for the banking platform."
                                )
                                .version("1.0.0")
                                .contact(
                                        new Contact()
                                                .name("Banking Platform")
                                )
                )
                .components(
                        new Components()
                                .addSecuritySchemes(
                                        "bearerAuth",
                                        new SecurityScheme()
                                                .name("Authorization")
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                )
                );
    }
}