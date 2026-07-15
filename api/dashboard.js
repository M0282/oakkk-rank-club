import { optionalUser } from "../lib/server/auth.js";
import { buildDashboard } from "../lib/server/dashboard.js";
import { handleError, json, methodNotAllowed } from "../lib/server/http.js";

export default {
  async fetch(request) {
    try {
      if (request.method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      const dashboard = await buildDashboard({
        force: url.searchParams.get("force") === "1",
        user: await optionalUser(request)
      });
      return json(dashboard, 200, { "Cache-Control": "private, no-store" });
    } catch (error) {
      return handleError(error);
    }
  }
};
