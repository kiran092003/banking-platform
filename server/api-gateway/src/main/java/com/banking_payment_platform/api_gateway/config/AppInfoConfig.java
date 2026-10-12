package com.banking_payment_platform.api_gateway.config;

import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppInfoConfig {

    @Bean
    public InfoContributor appInfoContributor() {

        return new InfoContributor() {

            @Override
            public void contribute(Info.Builder builder) {

                builder.withDetail(
                        "app",
                        new AppInfo()
                );
            }
        };
    }

    private record AppInfo(
            String name,
            String description,
            String version
    ) {

        public AppInfo() {

            this(
                    "API Gateway",
                    "Entry point and security gateway for banking microservices",
                    "1.0.0"
            );
        }
    }
}