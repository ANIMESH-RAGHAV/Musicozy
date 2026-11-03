# Musicozy Website Architecture

## 1. Purpose and scope

Musicozy is a music discovery and streaming website built on the Audius API. Users can browse and stream Audius music, organize their listening history and library, and use a gated download feature only for tracks Audius makes downloadable and whose rights/provider terms permit it.

This document uses Audius as the music catalog and streaming provider. Musicozy owns its users, library, history, subscriptions, entitlements, and application API; Audius provides upstream music metadata and audio playback. PostgreSQL is used for relational data examples.

For implementation details, use the [Audius API reference](https://docs.audius.co/api/), [Audius SDK docs](https://docs.audius.co/sdk/), and [Audius developer overview](https://docs.audius.co/developers/introduction/overview/). Confirm current authentication, endpoint, rate-limit, and track-rights requirements there before implementation.

## 2. System overview

```text
 Web / Mobile Clients
          |
     CDN + WAF
          |
    API Gateway
          |
  Musicozy Application API -------- Subscription Provider
   |      |          |                         |
 Auth  Audius API  Playback / Entitlements    Webhooks
   |      |          |
Postgres |       Usage Events
         |          |
    Metadata Cache  Queue / Stream Processor
         |          |
         |      Analytics Store
         |
    Audius audio delivery
```

### Main components

- **Client:** Web app (and later mobile apps) for account management, search, playback, library, history, and downloads. It never receives storage credentials or payment-provider secrets.
- **CDN and API gateway:** TLS termination, WAF/rate limits, request routing, and API versioning. The gateway forwards a verified user identity to the API but does not make subscription decisions.
- **Application API:** Owns business rules and exposes versioned REST endpoints. Keep modules for identity, catalog, library/history, playback, subscriptions, and administration in one deployable application initially; split services only when scale or team ownership warrants it.
- **Identity provider / auth module:** Handles registration, login, email verification, password reset, session refresh, and optional OAuth or MFA. Store password hashes using a modern password-hashing algorithm if credentials are managed in-house.
- **Audius adapter:** A backend module that calls the Audius REST API or supported SDK for track, artist, playlist, search, and streaming data. It translates Audius responses to Musicozy's internal models, handles upstream credentials/configuration, caching, timeouts, rate limits, and provider errors. Keep Audius secrets on the server and follow Audius API requirements.
- **Catalog and search:** Audius remains the source of truth for provider-owned tracks and metadata. Musicozy stores only the metadata needed for its own features and Audius IDs for lookup; refresh or expire cached metadata rather than treating a local copy as authoritative.
- **Playback:** The API checks Musicozy account and feature rules, then the client plays audio using the supported Audius streaming flow. Audius, not Musicozy object storage, delivers the audio. Do not download, re-host, or transcode Audius audio unless the provider and rights for that track explicitly permit it.
- **Subscription provider:** Processes checkout and renewals. A verified webhook updates local subscription state; provider callbacks are not trusted as client input.
- **Usage pipeline:** Accepts playback lifecycle events, validates and deduplicates them, then writes operational usage records and sends aggregate events to analytics.
- **PostgreSQL:** Source of truth for Musicozy users, permissions, Audius track references and cached metadata, subscriptions, libraries, history, and API usage records.

## 3. Authentication, authorization, and paywall

### Authentication

1. A user registers with an email and password or an approved identity provider.
2. The identity module verifies the account and issues a short-lived access token and a rotating refresh token in a secure, HTTP-only, same-site cookie for the website.
3. API requests validate token signature, issuer, audience, expiry, and revocation/session state. Use TLS everywhere.
4. Support logout and refresh-token revocation. Keep secrets in a managed secret store, and never log tokens, passwords, or payment details.

Audius OAuth/login may be offered as an optional way to connect an Audius account, but it is separate from Musicozy authentication. Keep the Musicozy user ID as the owner of subscriptions, library, and history; an Audius identity or token does not grant a Musicozy plan entitlement.

### Authorization

Authentication establishes who the caller is; authorization checks what that caller may do. Enforce authorization in the application API for every protected resource, not only in the UI.

- Use **roles** for broad staff capabilities (`user`, `moderator`, `admin`) and **permissions** for actions.
- Use **ownership checks** for user-scoped resources: a user can read or change their own library, history, and settings, but not another user's.
- Use **entitlements** for plan-specific features, such as `download`, `offline_playback`, or higher playback limits.
- Restrict admin APIs separately, require MFA for privileged operators, and audit sensitive administrative actions.

### Download paywall and media access

1. The client requests a download for a track.
2. The API checks that the account is active, the track is explicitly downloadable through Audius, the applicable rights/provider terms permit the action, and the user has the required entitlement.
3. If access is denied, return `403` with a stable error code such as `ENTITLEMENT_REQUIRED`; the client can show the available plans.
4. If allowed, write an audit/usage event and use Audius's supported download mechanism, if one is available and permitted for that track.
5. Apply rate limits and plan quotas. Never create a Musicozy-hosted copy or expose a download option for tracks without a verified provider capability and rights.

Do not treat hiding a download button as access control. Re-check entitlements on every Musicozy download request. A paywall can gate Musicozy's own APIs and user experience, but it cannot prevent users from accessing content independently available through Audius or another public endpoint. Streaming access should use the same availability and policy checks, with playback-specific entitlements if needed.

## 4. Data organization

Use UUID primary keys, UTC timestamps, foreign keys, and database migrations. Normalize transactional data; retain derived counters and analytics in separate tables or systems. Example core tables:

### Users and access

- `users(id, email, password_hash, display_name, status, created_at, updated_at)`: unique normalized email; status includes pending, active, suspended, and deleted.
- `sessions(id, user_id, refresh_token_hash, expires_at, revoked_at, created_at)`: store only a hash of refresh tokens.
- `roles(id, name)` and `user_roles(user_id, role_id)`: role assignments.
- `permissions(id, key)` and `role_permissions(role_id, permission_id)`: optional fine-grained staff/app permissions.

### Music catalog

- `artists(id, audius_artist_id, name, cached_at, ...)`
- `albums(id, audius_album_id, title, release_date, cached_at, ...)`
- `tracks(id, audius_track_id, album_id, title, duration_ms, availability, cached_at, ...)`: `audius_track_id` identifies the upstream track; retain only metadata required by Musicozy and refresh it from Audius.
- `track_artists(track_id, artist_id, artist_order)` for tracks with multiple artists.
- Do not store `audio_assets` or audio object keys for Audius media. Store a provider reference and resolve playback through the supported Audius API/SDK flow.

Treat Audius as authoritative for upstream track availability and streamability. Check current provider availability when starting playback or download rather than relying only on cached metadata.

### User organization: library and history

- `user_library_items(user_id, track_id, added_at)`: primary key `(user_id, track_id)`; indexes by `(user_id, added_at DESC)`.
- `playback_sessions(id, user_id, track_id, started_at, ended_at, source, device_id, completion_percent, request_id)`: one row per playback attempt/session.
- `listening_history(user_id, played_at, playback_session_id, track_id, listened_ms)`: append-oriented history, partitioned by time when volume warrants it; index `(user_id, played_at DESC)`.
- `playlists(id, owner_user_id, name, visibility, created_at, updated_at)` and `playlist_tracks(playlist_id, track_id, position, added_at)`.

History is private to the user by default. Provide controls to clear history and disable history recording. Define retention and account-deletion behavior up front; deleting or anonymizing a user must also address history, sessions, and derived user data.

### Plans, subscriptions, and entitlements

- `plans(id, code, name, active)` and `plan_entitlements(plan_id, entitlement_key, limit_value)`.
- `subscriptions(id, user_id, plan_id, provider, provider_subscription_id, status, current_period_start, current_period_end, updated_at)`.
- `entitlement_overrides(user_id, entitlement_key, value, expires_at, reason)`: optional grants for trials or support cases, with audit history.
- `payment_webhook_events(provider, provider_event_id, received_at, processed_at, status)`: unique `(provider, provider_event_id)` for idempotent webhook handling. Store no raw card data.

The application should derive effective entitlements from the active plan and any valid override. Cache briefly if necessary, with invalidation on subscription changes; the database remains authoritative.

### API and streaming usage

- `api_usage_events(id, occurred_at, user_id, api_key_id, request_id, provider, endpoint, method, status_code, latency_ms, bytes_sent, track_id, playback_session_id, event_type, dedupe_key)`: distinguish Musicozy API calls from outbound Audius API calls.
- `api_keys(id, owner_user_id, key_hash, label, scopes, created_at, last_used_at, revoked_at)`: only if partner/developer API keys are offered; store hashed keys and show the secret only once.
- Event types can include `api_request`, `playback_started`, `playback_heartbeat`, `playback_completed`, `download_requested`, and `download_issued`. Record client-observed playback separately from confirmed provider delivery.

Do not count every audio segment or Audius API lookup as a separate user play. Define a meaningful-play rule based on playback heartbeats/listened duration and deduplicate retries with `dedupe_key` or `request_id`. Track Musicozy API traffic, outbound Audius API traffic, and playback outcomes separately so provider requests are not confused with listener metrics. Audio bytes delivered directly by Audius may not be observable by Musicozy; do not present client-reported bytes as verified billing data.

Usage records should be append-only for auditability, with restricted access and a documented retention policy. For high volume, write events to a queue first, batch into partitioned PostgreSQL tables or an analytics store, and retain only the aggregates needed by product and billing. Avoid storing IP addresses or device identifiers unless needed; minimize, protect, and expire them.

## 5. Key flows

### Stream a track

1. Client calls `POST /v1/playback-sessions` with Musicozy's track ID and an idempotency key.
2. API authenticates the user and checks track availability, applicable entitlements, and rate limits.
3. API resolves the Audius track ID and requests the supported stream information from Audius. It returns only the playback data needed by the client and never exposes server-side credentials.
4. Client streams audio from Audius using the supported playback flow.
5. Client sends periodic playback heartbeats and a completion event to Musicozy. The API validates session ownership, deduplicates events, and records history/usage. Heartbeat-based history is an estimate and should not be represented as Audius-verified delivery.

### Download a track

1. Client calls `POST /v1/tracks/{trackId}/download`.
2. API checks authentication, track download capability/rights, plan entitlement, and any quota.
3. If Audius supports a permitted download for that track, the API follows that documented flow; otherwise it returns a clear unavailable response. A paywall response includes the required entitlement when access is denied.
4. Record the request outcome. Do not claim verified transfer or gate access to a public Audius stream that Musicozy does not control.

### Subscription change

1. Client starts checkout through the subscription provider.
2. Provider sends a signed webhook to the backend.
3. Backend verifies the signature, deduplicates the provider event, and updates the subscription transactionally.
4. Entitlements update from the new subscription state. The user can retry a previously denied action without relying on a client-supplied plan value.

## 6. API outline

All endpoints are versioned under `/v1`. Require authentication except for explicitly public catalog endpoints.

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /me`, `GET /me/entitlements`
- `GET /tracks`, `GET /tracks/{trackId}`, `GET /search`
- `POST /playback-sessions`, `POST /playback-sessions/{id}/heartbeat`, `POST /playback-sessions/{id}/complete`
- `GET /audius/tracks/{audiusTrackId}` (optional public catalog proxy; apply caching and upstream rate limits)
- `GET /me/history`, `DELETE /me/history`, `GET|POST|DELETE /me/library`
- `POST /tracks/{trackId}/download`
- `POST /billing/checkout`, `POST /webhooks/{provider}`

Use consistent pagination, request validation, idempotency for retryable writes, and stable error codes. Never accept a user ID from the client as proof of ownership; derive it from the authenticated identity.

## 7. Reliability, security, and operations

- Apply rate limits by IP for anonymous endpoints and by account/key for authenticated endpoints.
- Use least-privilege database/service credentials, encrypted transport, encrypted backups, and tested restore procedures.
- Record security-relevant events (login failures, entitlement denials, admin actions) without logging secrets or full signed URLs.
- Monitor API error rates and latency, Audius upstream availability/rate limits, playback start success, webhook retries, and queue lag.
- Make webhook processing and usage ingestion idempotent. Retry transient failures with bounded backoff and route exhausted events to a dead-letter queue.
- Add database indexes for actual query patterns; partition high-volume history and usage by time when the volume justifies it.
- Test authorization boundaries, subscription transitions, expired/revoked links, duplicate events, account deletion, and history privacy.
- Keep backups and migration procedures. Define recovery objectives before launch.

## 8. Suggested implementation order

1. Audius API adapter, identity, user library, and basic Audius playback.
2. Playback sessions and listening history with privacy and retention controls.
3. Plans, subscription webhooks, entitlement checks, and gated downloads.
4. API/streaming usage events, dashboards, quotas, and analytics scaling.
5. Search service, partner API keys, and service decomposition only when supported by measured needs.

friend track suggestion (added feature)