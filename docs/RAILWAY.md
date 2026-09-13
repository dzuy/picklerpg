# Railway deployment

Deploy the repository as one Node service. The root railway.json runs `npm run build`, starts `npm start`, and checks `/healthz`. The production server serves dist and both AI routes on the same port, listening on 0.0.0.0.

If the public domain target port is already 5173, set the service variable PORT=5173 as well. Alternatively use Railway's supplied PORT and make the domain target match it. Remove any dashboard start override that runs Vite or opponent-server; the start command must be npm start.

Set OPENAI_API_KEY and OPENAI_MODEL in Railway service variables to enable AI planning and command interpretation. Production uses the API provider rather than the local Codex CLI. Do not upload .env.local. Without API configuration, the page still loads and opponents use local fallback decisions.

Redeploy after the commit reaches the linked GitHub branch. Logs should report `Pickle RPG listening on 0.0.0.0:<port>`. Visit /healthz first, then the root URL. Asset paths, including /models and /assets, must stay on this same service.

Saved players remain local to each browser and origin. Existing localhost saves do not automatically move to the hosted URL.
