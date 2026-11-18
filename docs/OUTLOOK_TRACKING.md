# Outlook email tracking

## Purpose
Add an Outlook-backed correspondence layer to the Leo Jobs application tracker. Existing application records remain the source of truth; email threads are linked to an application only when the match is sufficiently reliable or manually confirmed.

## Data model
- `application_email_threads`: one correspondence thread per company/application context, linked to an existing application when known. Keeps direction, status, confidence, review flag, timestamps and Outlook deep link.
- `application_email_messages`: message metadata and a short preview, not a full mailbox archive. Stores Outlook message ID, sender/recipients, subject, received time, classification, automated flag and Outlook link.
- `outlook_sync_state`: mailbox sync status and Microsoft Graph delta cursor.

## Classification values
- `acknowledgement`: automatic or human receipt confirmation.
- `human_response`: substantive recruiter/company response.
- `interview_invitation`: interview scheduling/invitation.
- `assessment`: test or assessment.
- `rejection`: rejection.
- `offer`: offer.
- `redirect_to_portal`: asks candidate to apply through a portal.
- `follow_up_sent`: candidate follow-up.
- `unclassified`: requires review.

## Matching rules
1. Match Outlook conversation ID first.
2. Then match normalized subject and sender/recipient domain against company/contact on an application.
3. Use role title and message body preview only as supporting evidence.
4. Never auto-link a low-confidence match; send it to manual review.
5. A receipt acknowledgement does not count as a substantive response or interview.
6. A redirect to a career portal does not count as an application submission.
7. Preserve the original message date and Outlook deep link.

## Microsoft 365 integration required
The ChatGPT Outlook connector can inspect the user's mailbox in this conversation, but it does not provide credentials to the deployed Leo Jobs app. A separate Microsoft Entra app registration and Microsoft Graph OAuth authorization are required for app-side synchronization.

Recommended delegated permissions: `User.Read`, `Mail.Read`, `offline_access`. Do not request `Mail.Send`; Leo Jobs should not send messages automatically. Use OAuth authorization-code flow with PKCE, secure server-side token storage/encryption, and Microsoft Graph message delta queries/webhook renewal. Request the minimum permissions and explain mailbox access clearly.

Required Cloudflare Worker secrets/configuration are to be added only after the Entra app is registered. Never commit client secrets, access tokens, refresh tokens, mailbox message bodies, or personal data to Git.

## Suggested UI
A dedicated "Email Tracking" view under Candidaturas:
- Summary: sent, awaiting reply, human responses, interviews, rejections, needs review.
- Per-application timeline: outbound email and inbound replies, dates, classifications, Outlook open link.
- Review queue for ambiguous matches and automated acknowledgements.
- Manual actions: link to application, change classification, mark follow-up, exclude from job tracking.
- Export current filtered view to XLSX/CSV.

## Recovery and sync
- Initial recovery should be bounded by a user-selected date range and scan Sent Items plus Inbox and the user's application folder.
- Show a preview and ask the user to confirm ambiguous matches before writing them to the application history.
- Incremental sync should use Graph delta links and persist the cursor in `outlook_sync_state`.
- Store only message metadata and a short preview by default; fetch full bodies only on demand.
