package dev.skp.incident;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class IncidentApiTest {
    @Autowired MockMvc mvc;
    @Test void anonymousCannotRead() throws Exception { mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized()); }
    @Test void viewerCanSearchAndPaginate() throws Exception {
        mvc.perform(get("/api/incidents?q=payment&size=1").with(user("reader").roles("VIEWER")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].service").value("Payments"));
    }
    @Test void viewerCannotWrite() throws Exception {
        mvc.perform(patch("/api/incidents/INC-1041").with(user("reader").roles("VIEWER")).with(csrf())
            .contentType("application/json").content("{\"status\":\"INVESTIGATING\",\"version\":0,\"note\":\"Checking\"}"))
            .andExpect(status().isForbidden());
    }
    @Test void csrfIsRequired() throws Exception {
        mvc.perform(patch("/api/incidents/INC-1041").with(user("operator").roles("OPERATOR"))
            .contentType("application/json").content("{}" )).andExpect(status().isForbidden());
    }
    @Test void transitionCreatesAuditAndStaleWriteConflicts() throws Exception {
        String body = "{\"status\":\"INVESTIGATING\",\"version\":0,\"note\":\"Investigating provider retries\"}";
        mvc.perform(patch("/api/incidents/INC-1041").with(user("operator").roles("OPERATOR")).with(csrf())
            .contentType("application/json").content(body)).andExpect(status().isOk())
            .andExpect(jsonPath("$.version").value(1)).andExpect(jsonPath("$.history[0].actor").value("operator"));
        mvc.perform(patch("/api/incidents/INC-1041").with(user("operator").roles("OPERATOR")).with(csrf())
            .contentType("application/json").content(body)).andExpect(status().isConflict());
    }
    @Test void invalidPaginationAndFiltersAreRejected() throws Exception {
        mvc.perform(get("/api/incidents?size=500").with(user("reader"))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/incidents?status=BOGUS").with(user("reader"))).andExpect(status().isBadRequest());
    }
    @Test void cannotSkipLifecycle() throws Exception {
        mvc.perform(patch("/api/incidents/INC-1038").with(user("operator").roles("OPERATOR")).with(csrf())
            .contentType("application/json").content("{\"status\":\"RESOLVED\",\"version\":0,\"note\":\"Skip\"}"))
            .andExpect(status().isBadRequest());
    }
    @Test void unknownIncidentReturns404() throws Exception {
        mvc.perform(get("/api/incidents/INC-0").with(user("reader"))).andExpect(status().isNotFound());
    }
    @Test void localBasicLoginReturnsCsrfAndRole() throws Exception {
        mvc.perform(get("/api/session").with(httpBasic("operator", "operator-local")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.operator").value(true)).andExpect(jsonPath("$.csrfToken").isNotEmpty());
    }
}
