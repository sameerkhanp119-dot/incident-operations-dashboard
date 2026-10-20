package dev.skp.incident;

import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class IncidentStore {
    record Audit(String actor, String from, String to, String note, Instant at) {}
    record Incident(String id, String title, String service, String severity, String status,
                    String owner, Instant createdAt, long version, List<Audit> history) {}
    record Page(List<Incident> items, int total, int page, int size) {}
    record Change(String status, long version, String note) {}
    private final Map<String, Incident> incidents = new LinkedHashMap<>();
    private static final List<String> STATES = List.of("OPEN", "INVESTIGATING", "MONITORING", "RESOLVED");

    IncidentStore() {
        String[][] seeds = {
            {"Checkout latency above threshold", "Checkout API", "CRITICAL", "INVESTIGATING", "Maya Chen"},
            {"Payment webhook retry backlog", "Payments", "HIGH", "OPEN", "Alex Rivera"},
            {"Catalog index refresh delayed", "Search", "MEDIUM", "MONITORING", "Sam Taylor"},
            {"Elevated order consumer lag", "Order stream", "HIGH", "INVESTIGATING", "Jordan Lee"},
            {"Token refresh error spike", "Identity", "HIGH", "OPEN", "Maya Chen"},
            {"Export job exceeded time budget", "Analytics", "LOW", "OPEN", "Alex Rivera"},
            {"Inventory cache miss increase", "Inventory", "MEDIUM", "MONITORING", "Sam Taylor"},
            {"Notification provider recovery", "Notifications", "LOW", "RESOLVED", "Jordan Lee"},
            {"Search response regression", "Search", "MEDIUM", "OPEN", "Sam Taylor"},
            {"Order reconciliation mismatch", "Orders", "HIGH", "MONITORING", "Alex Rivera"},
            {"Delayed reporting snapshot", "Analytics", "LOW", "RESOLVED", "Maya Chen"},
            {"Inventory sync retry burst", "Inventory", "MEDIUM", "OPEN", "Jordan Lee"}
        };
        for (int i = 0; i < seeds.length; i++) {
            var s = seeds[i]; var id = "INC-" + (1042 - i);
            incidents.put(id, new Incident(id, s[0], s[1], s[2], s[3], s[4],
                Instant.now().minusSeconds(720L + i * 1440L), 0, List.of()));
        }
    }

    synchronized Page list(String query, String status, String severity, int page, int size) {
        if (page < 0 || page > 100_000 || size < 1 || size > 50) bad("Invalid page or size");
        if (status != null && !STATES.contains(status)) bad("Unknown status");
        if (severity != null && !List.of("CRITICAL", "HIGH", "MEDIUM", "LOW").contains(severity)) bad("Unknown severity");
        var q = query == null ? "" : query.toLowerCase(Locale.ROOT).strip();
        var rows = incidents.values().stream()
            .filter(i -> status == null || status.equals(i.status()))
            .filter(i -> severity == null || severity.equals(i.severity()))
            .filter(i -> (i.id()+" "+i.title()+" "+i.service()+" "+i.owner()).toLowerCase(Locale.ROOT).contains(q))
            .sorted(Comparator.comparing(Incident::createdAt).reversed().thenComparing(Incident::id)).toList();
        return new Page(rows.stream().skip((long) page * size).limit(size).toList(), rows.size(), page, size);
    }

    synchronized Incident get(String id) {
        var incident = incidents.get(id);
        if (incident == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found");
        return incident;
    }

    synchronized Incident change(String id, Change change, String actor) {
        var current = get(id);
        if (current.version() != change.version()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Incident changed; refresh before retrying");
        int index = STATES.indexOf(current.status());
        if (index == STATES.size()-1 || !STATES.get(index+1).equals(change.status())) bad("Only the next lifecycle state is allowed");
        if (change.note() == null || change.note().isBlank() || change.note().length() > 500) bad("A note of 1–500 characters is required");
        var history = new ArrayList<>(current.history());
        history.add(new Audit(actor, current.status(), change.status(), change.note().strip(), Instant.now()));
        var updated = new Incident(current.id(), current.title(), current.service(), current.severity(), change.status(),
            current.owner(), current.createdAt(), current.version()+1, List.copyOf(history));
        incidents.put(id, updated);
        return updated;
    }

    synchronized Map<String, Long> summary() {
        return Map.of("active", incidents.values().stream().filter(i -> !i.status().equals("RESOLVED")).count(),
            "critical", incidents.values().stream().filter(i -> i.severity().equals("CRITICAL") && !i.status().equals("RESOLVED")).count(),
            "monitoring", incidents.values().stream().filter(i -> i.status().equals("MONITORING")).count(),
            "resolved", incidents.values().stream().filter(i -> i.status().equals("RESOLVED")).count());
    }
    private static void bad(String reason) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason); }
}
