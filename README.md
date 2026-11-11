# Leo Encontra Trabalho!

Personal job discovery and application tracker.

## Live job discovery architecture

The app uses a Cloudflare Worker API and D1 database. It does not scrape sites or invent vacancies.

### Integrated public sources
- **Jobicy API**: public remote jobs feed, Europe region; no API key. Keep Jobicy as the source and preserve its canonical listing URL. Poll no more than once per hour.
- **Remotive API**: public remote jobs feed; delayed by approximately 24 hours. Attribute Remotive and link to its original listing. Poll no more than four times per day.
- **Employer career pages via public ATS job-board APIs**: Greenhouse, Lever, Ashby, SmartRecruiters and Workable. These return public employer-posted vacancies without requiring applicant credentials. Add each employer's verified ATS board slug to the `JOB_BOARDS` Worker variable.

### Sources not yet connected
LinkedIn Jobs, Indeed, Google Jobs, EURES, Net-Empregos, Carga de Trabalhos, SAPO Emprego and other portals do not all provide a suitable unrestricted public API for this app. They need an authorized API, feed, or a compliant search provider integration. Do not scrape or bypass access controls or site terms. The Career Radar ChatGPT plugin is a ChatGPT-side search workflow, not an API key or embeddable backend service; its search, verification, language, seniority, fit and anti-fabrication rules are being used as the product methodology.

## Cloudflare setup required

1. Create a D1 database named `leo-jobs` in Cloudflare.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the database ID returned by Cloudflare.
3. Apply the schema:
   ```bash
   npx wrangler d1 migrations apply leo-jobs --remote
   ```
4. In Worker Settings → Variables, add `JOB_BOARDS` as JSON. Only add verified company board identifiers. Example:
   ```json
   [
     {"provider":"greenhouse","slug":"verified-board-slug","company":"Verified employer"},
     {"provider":"lever","slug":"verified-company-slug","company":"Verified employer"},
     {"provider":"ashby","slug":"verified-board-slug","company":"Verified employer"}
   ]
   ```
   Replace the example values with verified employer board slugs; they are not real configured sources.
5. Deploy with `npm run build` then `npx wrangler deploy`.

The Worker has a 30-minute Cron schedule for configured employer ATS boards. Jobicy is limited to hourly polling and Remotive to six-hour intervals to respect their published API terms. This does not mean every portal or employer is covered.

## API
- `GET /api/health` — API and configured employer board count.
- `GET /api/jobs?days=15&q=marketing` — stored vacancies, newest first.
- `POST /api/sync` — manual sync, rate-limited.
- Scheduled Worker execution — automatic source sync.

## Development
```bash
npm install
npm run dev
npm run build
```

## Data integrity
- No demo vacancies are seeded.
- Keep source attribution and original vacancy links.
- Preserve first-seen timestamps and deduplicate by source + listing ID.
- Unknown salary, language, date or application route must remain unknown; never infer them.
- Public remote feeds are supplemental and do not replace country-specific employer and job-board searches.
- Verify each vacancy is still live on the employer's own page before recommending it as a confirmed application.
