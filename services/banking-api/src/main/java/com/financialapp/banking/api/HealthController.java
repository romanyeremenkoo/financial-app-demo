package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.HealthDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final Environment environment;
    private final String version;

    public HealthController(Environment environment,
                            @Value("${app.version:1.0.0}") String version) {
        this.environment = environment;
        this.version = version;
    }

    @GetMapping("/health")
    public HealthDto health() {
        String[] profiles = environment.getActiveProfiles();
        String profile = profiles.length > 0 ? profiles[0] : "default";
        return new HealthDto("UP", version, profile);
    }
}
