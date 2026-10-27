package com.financialapp.banking.config;

import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers converters so query-string enum parameters are parsed from their
 * lowercase wire values (e.g. {@code ?category=income}) rather than Java's
 * name-based {@code Enum.valueOf}.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new Converter<String, TransactionCategory>() {
            @Override
            public TransactionCategory convert(String source) {
                return TransactionCategory.fromWire(source);
            }
        });
        registry.addConverter(new Converter<String, TransactionDirection>() {
            @Override
            public TransactionDirection convert(String source) {
                return TransactionDirection.fromWire(source);
            }
        });
    }
}
