package com.financialapp.banking.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI bankingApiOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Financial App — Banking API")
                        .version("1.0.0")
                        .description("Backend for the Financial App portfolio project. "
                                + "Fictional personal-banking simulation; holds no real accounts.")
                        .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")));
    }
}
