package com.college.odsystem.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API, non-static-asset routes to index.html so that
 * React Router can handle client-side navigation (e.g. /dashboard, /signin).
 *
 * Without this, refreshing the browser on a React route would return a 404
 * from Tomcat because no physical file exists at that path.
 */
@Controller
public class SpaForwardController {

    /**
     * Match any path that:
     * - does NOT start with /api
     * - does NOT contain a dot (i.e. is not a file like .js, .css, .png)
     * Forward all such paths to /index.html for client-side routing.
     */
    @GetMapping(value = {
        "/",
        "/signin",
        "/signup",
        "/setup",
        "/dashboard",
        "/dashboard/**"
    })
    public String forwardToReact() {
        return "forward:/index.html";
    }
}
