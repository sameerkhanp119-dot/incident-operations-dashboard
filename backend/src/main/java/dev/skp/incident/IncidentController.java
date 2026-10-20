package dev.skp.incident;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class IncidentController {
    private final IncidentStore store;
    IncidentController(IncidentStore store) { this.store = store; }
    @GetMapping("/health") Map<String, String> health() { return Map.of("status", "UP"); }
    @GetMapping("/session") Map<String, Object> session(Authentication auth, CsrfToken csrf) {
        return Map.of("user", auth.getName(), "operator", auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OPERATOR")),
            "csrfToken", csrf.getToken(), "csrfHeader", csrf.getHeaderName());
    }
    @GetMapping("/summary") Map<String, Long> summary() { return store.summary(); }
    @GetMapping("/incidents") IncidentStore.Page list(@RequestParam(defaultValue="") String q,
        @RequestParam(required=false) String status, @RequestParam(required=false) String severity,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="5") int size) {
        return store.list(q, status, severity, page, size);
    }
    @GetMapping("/incidents/{id}") IncidentStore.Incident get(@PathVariable String id) { return store.get(id); }
    @PatchMapping("/incidents/{id}") IncidentStore.Incident change(@PathVariable String id,
        @RequestBody IncidentStore.Change change, Principal actor) { return store.change(id, change, actor.getName()); }
}
