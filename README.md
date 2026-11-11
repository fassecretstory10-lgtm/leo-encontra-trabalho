# Leo Encontra Trabalho!

Personal job discovery and application tracker.

## Live job discovery architecture

The app uses a Cloudflare Worker API and D1 database. It does not scrape sites or invent vacancies.

### Integrated public sources
- **Google Jobs via SerpApi**: searches Portugal, Netherlands, Switzerland and Dubai at 09:00 Lisbon time. Requires a SerpApi account/API key stored as the Cloudflare Worker secret `SERPAPI_KEY`. This is a paid third-party search provider; no searches run and no charges accrue until the key is configured. Google Jobs can surface listings indexed from job portals, but this is not an official LinkedIn or Indeed API.
- **Jobicy API**: public remote jobs feed, Europe region; no API key. Keep Jobicy as the source and preserve its canonical listing URL. Poll no more than once per hour.
- **Remotive API**: public remote jobs feed; delayed by approximately 24 hours. Attribute Remotive and link to its original listing. Poll no more than four times per day.
- **Employer career pages via public ATS job-board APIs**: Greenhouse, Lever, Ashby, SmartRecruiters and Workable. These return public employer-posted vacancies without requiring applicant credentials. The first verified employer boards are already configured in `wrangler.toml`: Dapper, Air Apps, Hostinger, Web Summit, Aethos, Younited, IDT, Emma, WPP Media, Upwork, Devoteam, Continental and AUTODOC. The registry can be expanded with more verified employer boards.

### Sources not yet connected
LinkedIn Jobs, Indeed, Google Jobs, EURES, Net-Empregos, Carga de Trabalhos, SAPO Emprego and other portals do not all provide a suitable unrestricted public API for this app. They need an authorized API, feed, or a compliant search provider integration. Do not scrape or bypass access controls or site terms. The Career Radar ChatGPT plugin is a ChatGPT-side search workflow, not an API key or embeddable backend service; its search, verification, language, seniority, fit and anti-fabrication rules are being used as the product methodology.

## Cloudflare setup required

1. Create a D1 database named `leo-jobs` in Cloudflare.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the database ID returned by Cloudflare.
3. Apply the schema:
   ```bash
   npx wrangler d1 migrations apply leo-jobs --remote
   ```
4. Optionally add `SERPAPI_KEY` as a Worker secret to enable the daily Google Jobs search. The provider has its own paid plans and quotas. The `JOB_BOARDS` list is seeded in `wrangler.toml`. To expand it, add only verified company board identifiers. Example:
   ```json
   [
     {"provider":"greenhouse","slug":"verified-board-slug","company":"Verified employer"},
     {"provider":"lever","slug":"verified-company-slug","company":"Verified employer"},
     {"provider":"ashby","slug":"verified-board-slug","company":"Verified employer"}
   ]
   ```
   The example values above are placeholders only; the initial configured list is the verified list named earlier in this README.
5. Deploy with `npm run build` then `npx wrangler deploy`.

The Worker has a 30-minute Cron schedule for configured employer ATS boards. Google Jobs runs once daily at 09:00 Lisbon local time if `SERPAPI_KEY` is configured. Jobicy is limited to hourly polling and Remotive to six-hour intervals to respect their published API terms. This does not mean every portal or employer is covered.

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

## Application workflow\nThe dashboard separates discovery, saved vacancies, and actual applications. The 15-day view is only a filter; `days=all` keeps older vacancies available in the archive. Saved vacancies and application records are persisted in D1. When a user selects “Quero concorrer”, the app asks for the application channel (company website, email, LinkedIn Easy Apply, external LinkedIn application, or other) and optional notes, then records the intention as “Quero concorrer”. It does not mark the vacancy as submitted. The application channel and last update are shown in the tracking view. Statistics are calculated from recorded applications, not demo data. Outlook draft creation with a tailored cover letter and CV attachment is not yet connected; no email is sent automatically.\n\n## Data integrity
- No demo vacancies are seeded.
- Keep source attribution and original vacancy links.
- Preserve first-seen timestamps and deduplicate by source + listing ID.
- Unknown salary, language, date or application route must remain unknown; never infer them.
- Public remote feeds are supplemental and do not replace country-specific employer and job-board searches.
- Verify each vacancy is still live on the employer's own page before recommending it as a confirmed application.
