package dev.skp.incident;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {
    @Bean
    UserDetailsService users(@Value("${demo.viewer-password}") String viewer,
                             @Value("${demo.operator-password}") String operator) {
        var encoder = new BCryptPasswordEncoder();
        return new InMemoryUserDetailsManager(
            User.withUsername("viewer").password("{bcrypt}" + encoder.encode(viewer)).roles("VIEWER").build(),
            User.withUsername("operator").password("{bcrypt}" + encoder.encode(operator)).roles("OPERATOR").build());
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a
                .requestMatchers("/api/health").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/incidents/**").hasRole("OPERATOR")
                .anyRequest().authenticated())
            // CSRF remains enabled. /api/session exposes a token to the same-origin client.
            .httpBasic(Customizer.withDefaults())
            .formLogin(f -> f.disable())
            .build();
    }
}
