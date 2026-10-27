package com.financialapp.banking;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;
import java.io.IOException;

/**
 * Developer entry point that boots the real application against a throwaway
 * PostgreSQL instance started from the zonky binaries.
 *
 * <p>It exists so the shared API can be run locally with a single command even
 * when neither Docker nor a native PostgreSQL install is available:
 *
 * <pre>./mvnw spring-boot:test-run</pre>
 *
 * <p>The database is recreated on every start and discarded on exit, so it is a
 * convenience for demos and frontend API-mode development only. Use the normal
 * {@code spring-boot:run} entry point with a persistent database for anything
 * that must survive a restart.
 */
public final class TestBankingApiApplication {

    private TestBankingApiApplication() {
    }

    public static void main(String[] args) {
        SpringApplication.from(BankingApiApplication::main)
                .with(EmbeddedPostgresConfiguration.class)
                .run(args);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class EmbeddedPostgresConfiguration {

        @Bean
        DataSource dataSource() throws IOException {
            return EmbeddedPostgres.builder().start().getPostgresDatabase();
        }
    }
}
