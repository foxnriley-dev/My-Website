I Fix Everything Claude Code build prompt

Version 4 — I Fix Everything with Free and Pro subscriptions across web iOS and Android

Based on Motor Repair App Master Blueprint version 1.0, with Riley’s confirmed platform decision overriding its web first recommendation.

How Riley should use this file

Create or open the project folder in Claude Code. Put this file in the project folder as BUILD_PROMPT.md. Put Motor_Repair_App_Master_Blueprint.docx in a reference folder if available. Paste the text between START PROMPT and END PROMPT into Claude Code, or tell it: “Read BUILD_PROMPT.md and execute the instructions between START PROMPT and END PROMPT.”

This draft requires a responsive website plus native iOS and Android applications for the initial release, the confirmed name I Fix Everything, a neutral light and dark interface, US English, and an invite based beta preceding a Free and Pro public release. Platform, product name, and the Pro starting price of USD 14.99 per month are confirmed. Usage allowances remain proposed settings pending cost validation. The first execution builds Milestones 1 and 2 and prepares the later stages; the continuation instruction at the end advances subsequent milestones. The full product scope is included so early architecture supports the complete app.

The master blueprint is supporting context, not a substitute for this execution request. If Claude cannot read the DOCX, it should use a local document extraction library if available or continue from the detailed requirements below and identify the missing reference. It must not claim to have read an attachment it cannot access.

────────

START PROMPT

You are my lead product engineer and full stack developer. Build a real application for owners trying to identify and repair problems with cars, go karts, motorcycles, mini bikes, motorized bicycles, and small engine equipment.

Users should be able to take or upload photos, explain the problem, identify their machine, answer useful follow up questions, and receive evidence based next steps. When supported by the machine identity and reliable sources, the app should identify compatible replacement parts and tools, provide buying links, show installation instructions, and find relevant YouTube videos.

The desired experience is a knowledgeable repair companion that helps someone understand what to do next. Do not promise perfect diagnosis from one picture. Build the mechanisms that allow the app to be specific when evidence supports it and ask for more information when it does not.

1 Your immediate assignment

Read the repository instructions and inspect the existing project before modifying anything. Preserve useful conventions, existing code, and unrelated changes. If the repository is empty, initialize a suitable application. Do not assume an existing project needs to be replaced.

Read reference/Motor_Repair_App_Master_Blueprint.docx if present. Preserve its core evidence, privacy, fitment, and safety requirements. This prompt selects the implementation defaults and first work package; it does not waive the blueprint’s safeguards. Riley has explicitly chosen website plus iOS and Android from day one. That decision overrides all web first, PWA only, or native apps deferred statements in the older blueprint. Do not ask Riley to choose the platform again. The confirmed I Fix Everything name and required subscription implementation also override the older blueprint’s temporary name and optional billing direction.

First give a concise implementation plan and state material assumptions. Then implement Milestones 1 and 2 below. Do not stop after planning, producing a landing page, or drawing static screens. Leave runnable web, iOS, and Android clients with functioning authentication infrastructure, garage, cases, secure image intake, saved symptoms, and revision handling against one shared backend. Build the three clients during each milestone; do not postpone native implementation until the website is finished. Finish by reporting checks performed and exactly what works.

Build later milestone interfaces and domain boundaries only where necessary to avoid rework. Do not claim later features are implemented because their tabs exist. After the first work package is complete, stop at that reviewable boundary and identify the next milestone. If a required dependency is missing, finish all unblocked work and describe the exact remaining setup.

Autonomy and questions

Make routine reversible engineering decisions yourself. Ask me when an answer materially changes the platform, paid infrastructure, source licensing, publication, or core product scope. Ask one to three focused questions at a time and provide a recommended default. Do not repeatedly ask questions already answered in this prompt or the repository.

Do not ask me to choose minor library details, button padding, schema field names, or folder conventions. Record those decisions. Do not delete user data, replace an established stack, publish the app, start paid services, or enable live billing without explicit authorization. Never request that I paste secrets into ordinary chat; describe where to configure them securely.

When a capability is blocked, state whether it is blocked by credentials, content, code, environment, or human review. Do not silently replace a real integration with fake production results.

2 Product defaults

Use these until I explicitly change them:

• Confirmed product name: I Fix Everything. Use this exact capitalization throughout consumer copy and branding. Store branding in one configuration module. The paid tier is I Fix Everything Pro, with an owner-approved starting price of USD 14.99 per month. No trademark, domain, or store name availability check is implied. The brand is not a literal promise to diagnose or repair every machine.
• Confirmed initial platforms: a responsive website and native iOS and Android apps. A PWA may supplement the website but cannot substitute for either native app. All three use the same user accounts, garage, cases, evidence, and outcomes.
• Initial market: US English and USD. Allow metric or US customary display while preserving original source units.
• Users: adult DIY owners and hobbyists, especially people who do not know the technical name of a component.
• Confirmed business direction: Free access plus a paid upgraded subscription. Build the Pro subscription workflow for the first public release, including server entitlements and web, iOS, and Android purchase adapters. The confirmed tier name and monthly price, plus proposed quotas, are specified in Section 21. Implement and test using sandbox environments; do not activate real charges before final plan approval and production setup.
• Coverage: broad machine intake, with specific troubleshooting and repair capabilities enabled only for supported tasks and configurations.
• Branding: standalone product. Do not reuse Visible Valley branding unless I request it.
• Private by default: machine records, symptoms, photos, repair histories, and exports.

The minimum useful experience is: add a machine, open a case, upload evidence, describe symptoms, receive a supported next action or request for missing information, and return to the same case later.

The complete product must also support compatible parts, buying options, relevant videos, repair steps, progress, outcomes, and specialist handoff. Build toward that complete loop rather than a generic chat page.

3 Recommended implementation stack

If there is no existing suitable stack, use a TypeScript monorepo: Next.js with React for the responsive website and browser application; React Native with Expo and Expo Router for iOS and Android; PostgreSQL, Supabase Auth and private Storage; shared runtime schemas; and a durable background job system. Use compatible pinned versions selected from current official documentation. Expo’s monorepo guidance supports keeping multiple applications and shared packages together; it does not mean every UI component should be shared.

Recommended layout: apps/web, apps/mobile, apps/worker, packages/contracts, packages/api-client, packages/domain, and packages/design-tokens. Keep privileged domain implementation server only; share safe types, schemas, formatting, and client request helpers with mobile. Native apps must not import Next.js server code, browser DOM libraries, database credentials, or service-role keys. Use native components and platform appropriate navigation rather than wrapping the website in a WebView.

Keep one canonical versioned HTTPS API consumed by both web and native. It may initially be hosted in the web server application, but essential operations cannot exist only as browser-bound server actions. Provide a browser auth adapter and a native auth adapter against the same identity service. Use a maintained accessible web component system and native equivalents with shared design tokens. Include browser, native, and domain tests.

Prefer a modular server backend with web and native clients and a worker. Avoid an elaborate microservice architecture. Choose a durable queue compatible with the deployment model and document the choice. Long running jobs must not depend on a browser remaining open or an in memory timer surviving a server restart.

Use an inference provider adapter. Anthropic is the initial candidate, but select a supported model through current documentation and evaluation rather than hardcoding a guessed model name. Claude Code builds the app; consumer AI requests use a separately configured API.

Check official documentation for current SDK signatures, supported media formats, model identifiers, API limits, and security integration patterns before implementing provider calls. Pin dependency versions and record runtime requirements. Do not copy remembered obsolete API examples without checking them.

Keep production secrets server side. Include .env.example with descriptions and empty placeholders. Do not commit real credentials. Keep authentication, authorization, source validation, safety policy, fitment checks, and usage decisions out of client only logic.

4 Application design

Make the interface feel like a clear, capable workshop tool. Use charcoal and off white surfaces with a restrained blue accent as an initial design choice. Support light, dark, and system themes. Use color tokens so branding can change easily. Status meanings must also appear in text and icons.

Use readable typography, generous spacing, recognizable icons, and large primary controls. Favor simple useful transitions and respect reduced motion. Avoid decorative 3D scenes, endless animated gradients, fake analytics, and generic dashboard clutter.

Test narrow phone browser layouts, medium screens, desktop, iOS, and Android. Native screens must respect safe areas, software keyboards, Android back behavior, system font scaling, and screen readers. Use platform appropriate gestures without hiding required actions. On a phone, put the next useful action within easy reach. On desktop, show evidence beside the active assessment or guide when space permits. Preserve text readability with larger system fonts. No horizontal overflow in core flows.

Use plain labels such as “Add photos,” “What happens when you try to start it?”, “What we can see,” “Possible causes,” “Check compatibility,” and “Mine looks different.” Do not expose model tokens, database IDs, JSON, provider names, or internal safety classes in ordinary consumer screens.

Required screens

1. Public home: concrete explanation, start repair action, clearly labeled sample, and accurate scope. No fabricated users, endorsements, testimonials, or success rates.
2. Authentication: sign in, sign up or invite flow, session handling, logout, and recovery using configured provider capabilities.
3. Dashboard: resume an open case, add a machine, start a repair, and recent activity. Useful first time empty state.
4. Garage: machine list and details, identity completeness, installed engine or motor, modifications, and related cases.
5. Repair intake: select machine, describe concern, upload photos, answer relevant risk questions, and review before submission.
6. Case workspace: Overview, Evidence, Troubleshooting, Parts, and Guide tabs, with video resources placed in an obvious contextual area. Keep case and machine identity visible.
7. Parts: required replacements, optional items, consumables, and tools separated clearly.
8. Repair mode: one step at a time, complete plan preview, prerequisites, expected results, pause, notes, and “Mine looks different.”
9. Outcome: user reported result, unresolved concerns, replaced parts, and reopen case.
10. Account: units, region, privacy, export, deletion, notification preferences, and billing only when enabled.
11. Admin: controlled source and task approval, incident review, integration health, costs, and feature switches. Implement in the operational milestone.

Implement the consumer screens on web, iOS, and Android. The public marketing homepage and internal administration can remain web only. Core repair capabilities must have functional parity; layout need not be identical. Every screen needs appropriate loading, empty, error, retry, denied access, and unavailable capability states. Hidden or deferred functions must not appear operational. Errors must preserve user input.

5 Machine identity

Represent factory identity and installed components separately. A modified go kart can have one chassis and a different engine; a model dropdown alone is insufficient.

Store category, nickname, make, model, year, market, variant, fuel or power type, engine identifier, serial or VIN where relevant, installed components, modifications, and provenance per field. Allow unknown values. Never require users to invent a model year to continue.

Distinguish user entered, OCR extracted, decoder supplied, catalog matched, and reviewer confirmed information. Show uncertain label readings for confirmation. Never silently resolve conflicting identifiers.

Create immutable machine revisions for changes affecting compatibility or diagnosis. Every assessment, fitment assertion, and repair guide references a revision. A relevant change makes dependent recommendations stale until reassessed. Preserve historical context for completed repairs.

A VIN decoder such as NHTSA vPIC is an identification aid, not a repair or universal fitment database. Keep small engine labels, e bike electrical components, and modified assemblies on separate identification paths.

6 Case intake and evidence

Support JPEG, PNG, WebP, and HEIC ingestion when the chosen conversion pipeline can safely handle them. Start with configurable product limits of eight images per submission and 15 MB per original. Match analysis derivatives to the inference provider’s supported formats.

Request an overview, a close photo of the concern, and a label photo when useful. Allow retake, remove, reorder, and independent upload retry. If camera permission is denied, allow file selection. Photos should never require approaching moving or hazardous components.

Use authenticated scoped upload sessions and server generated object keys. Validate actual media signatures, file size, decoded pixel count, and ownership. Quarantine and sanitize before processing. Correct orientation, produce private previews, remove location metadata from analysis derivatives, and preserve the original privately under the retention policy.

Record every crop and annotation against its source. AI highlighted regions are approximate and user confirmable. Do not calculate real dimensions from an uncalibrated photo or create a generated “after repair” image as if it were evidence.

Collect symptoms, onset, frequency, conditions, recent work, modifications, warning codes, and previous attempts. Ask adaptive questions that change identification, risk, or the likely cause. “Unknown,” “Skipped,” and “Cannot safely check” are distinct from a negative test result.

Save draft progress. Persist submitted evidence with timestamps and provenance. Contradictory statements require clarification; do not discard one silently.

7 Diagnostic behavior

Implement an explicit server orchestrated pipeline:

1. Authorize access and freeze the input revision.
2. Validate processed media and screen for hazards.
3. Extract observations and candidate identifiers.
4. Reconcile identity and identify missing fields.
5. Retrieve applicable source material and approved checks.
6. Generate a small set of hypotheses and the next useful action.
7. Validate sources, claims, specifications, scope, and risk.
8. Save an immutable assessment and publish only validated output.
9. If eligible, resolve parts, offers, videos, and a reviewed guide.

Separate observations, user reports, measurements, and inferences. Each hypothesis needs supporting evidence, contradictory evidence, and a useful distinguishing check if available. Do not generate a long list of unrelated faults.

Use evidence labels such as insufficient information, tentative, supported, and confirmed by a defined test. Do not show invented numerical accuracy percentages. A confirmed visible defect does not prove it is the only cause.

If identity is unknown, prioritize identification. If cause is uncertain, continue troubleshooting. If the likely issue is supported but the repair procedure is missing, explain what is known and offer handoff. Never fill missing critical specifications from general model memory.

Do not stream unvalidated mechanical instructions into the UI. Neutral processing updates are acceptable. A second model review is supplementary and cannot replace applicable source evidence or qualified review.

Keep inference prompts versioned in the repository, with fixtures and regression evaluation. Retrieved text, OCR, documents, and descriptions are untrusted data, never higher priority instructions.

8 Safety, evidence, and repair eligibility

Implement blueprint rules R001 through R008 as testable invariants:

• Critical mechanical claims need applicable evidence or remain explicitly unverified.
• Exact fitment requires the fields relevant to that component.
• Safety holds override normal workflow and paid entitlements.
• Missing specifications remain unknown and block dependent steps.
• URLs come from retrieved records or clearly labeled search routes.
• Purchases, external sharing, bookings, and messages require deliberate user action.
• New evidence creates revisions and invalidates dependent outputs when necessary.
• Unsupported machines or tasks receive limited guidance or handoff, not invented procedures.

Use a reviewed task allowlist for executable repair guidance. No approved source or reviewer record means no approved production procedure. The coding agent must never create a fake expert approval, reviewer identity, or licensing claim.

Risk screening happens at intake and on every material update. Reported fuel leaks, smoke, damaged batteries, exposed electrical hazards, and loss of braking or steering must route through appropriate holds. High voltage internals, battery pack opening, airbags, major structural work, and other excluded tasks receive specialist handoff.

Do not provide bypass instructions for guards, interlocks, protective circuits, immobilizers, or emissions systems. Do not infer roadworthiness from photos or checkboxes. “Expert mode” cannot remove a hold.

Treat missing risk evidence as uncertainty, not proof of safety. Acknowledging a warning does not satisfy a missing prerequisite.

9 Parts, fitment, and offers

Separate canonical parts, compatibility assertions, and merchant offers. Store OEM identifiers, aftermarket references, supersessions, and merchant SKUs distinctly as strings.

Define compatibility requirements by component family. Relevant attributes may include engine code, build range, dimensions, mounting pattern, shaft, connector, voltage, polarity, protocol, and firmware. A similar photo or matching connector shape is not proof of compatibility.

Fitment states: unverified, needs_information, source_supported, contradicted, and stale. A source supported result requires evidence for the relevant configuration. User confidence or a retailer’s “universal” wording cannot bypass checks.

A part card shows why it may be needed, fitment state, confirmed and missing attributes, quantity, included items, seller, price and currency if retrieved, checked time, shipping information if known, and supporting sources. Never compare kit pricing with a single component without disclosure.

Use approved catalog adapters or a lawful curated collection initially. Do not assume retailer APIs or commercial catalog rights exist. Product links must be retrieved and validated. If no verified listing exists, show a labeled search link or exact search phrase. Never invent a URL, price, stock count, or delivery date.

Affiliate commissions must not influence compatibility or safety. Keep buying external in the first release. Do not implement automatic checkout.

10 YouTube resources

Implement a server side adapter using the currently documented YouTube Data API. Search by machine or engine family, task, and language, then verify returned video records before display.

Show title, channel, duration when available, checked date, relevance explanation, and one of these labels: exact configuration and task reviewed; same family and task; general explanation; metadata candidate.

Only use “reviewed” when content was actually reviewed with a recorded basis. Title and description matching alone is a metadata candidate. Do not claim to have watched content that was inaccessible. Do not assume captions are downloadable or licensed for reuse. Never fabricate chapter timestamps.

Handle deleted, private, restricted, and unembeddable videos. Follow quota and retention rules. When lookup fails or finds nothing appropriate, show an honest empty state and a labeled YouTube search option. A video is supporting material, not authority to override an applicable service source.

11 Repair guides and sources

A guide contains a machine revision, procedure revision, applicable sources, prerequisites, parts, tools, consumables, estimated effort with assumptions, steps, stop conditions, and task specific verification.

Critical specifications are structured records: name, value, original units, converted display if used, applicability, exact source location, and verification status. Do not bury torque or electrical settings in arbitrary generated prose. A missing required value blocks the dependent step.

Each step records prerequisites, action, tools, specification references, expected result, stop conditions, response schema, and allowed branches. Unknown or skipped checks cannot follow a passed branch. “Mine looks different” pauses execution and requests clarification.

Persist progress by guide revision. Changed instructions cannot silently inherit completed checkboxes. User reported success is not a professional inspection. If the repair fails, retain the attempted intervention and revise the hypotheses rather than repeating the same recommendation automatically.

Store source publisher, revision, rights or permission status, applicability, retrieval time, location, and hash. Filter applicability before semantic similarity. Conflicting critical sources block the affected procedure. A revoked source invalidates dependent guides.

User uploaded manuals remain private unless separate rights and consent authorize other use. Do not scrape or redistribute licensed repair databases without permission. The first production guide remains disabled until its source and review prerequisites exist; the rest of the app can still function.

12 Domain schemas and storage

Create shared runtime schemas and relational models for:

• User profile and preferences.
• Machine and immutable machine revision.
• Repair case, evidence, media, and derivatives.
• Assessment, questions, answers, and diagnostic checks.
• Sources, passages, specifications, approved tasks, and reviews.
• Parts, fitment assertions, and merchant offers.
• Video references and review status.
• Guide revisions and step progress.
• Usage reservations, settled usage events, and provider costs.
• Audit events, incident reports, and feature switches.
• Plans, plan versions, billing accounts, subscriptions, purchase events, entitlements, and usage windows. Establish these schemas in the foundation milestone; integrate sandbox purchasing before public release.

Use foreign keys, ownership policies, timestamps, unique idempotency keys, and constraints. Authorize relations as well as top level rows. Prevent an assessment from referencing another user’s evidence or an unrelated case’s image.

Assessment payload fields include schema_version, case_id, input_revision, identity_status, summary, observations, hypotheses, missing_information, next_action, risk, source_refs, limitations, and capabilities. Runtime validation must reject unknown source IDs, invalid references, and contradictions between risk and executable actions.

The model may suggest capabilities, but server policy derives the effective permissions. A model cannot authorize its own guide generation.

Use explicit nulls or unknown states. Never use zero as a substitute for an unknown mechanical value. Preserve units and measurement provenance.

13 API and workflow

Use a canonical versioned authenticated HTTPS API with documented contracts usable by browser, iOS, and Android clients. Do not implement core operations exclusively as Next.js server actions. Required operations include machines, revisions, cases, uploads, upload completion, assessments, job status, answers, parts, videos, guide requests, step progress, outcomes, exports, incident reports, and deletion.

Long running requests return a job identifier and input revision. Use stable errors with a safe message, request ID, retryability, and field errors where appropriate. Return a conflict for stale updates. Do not expose provider secrets or internal stack traces.

Case states: draft, awaiting_media, processing, needs_information, assessment_ready, guide_ready, repair_in_progress, verification_pending, resolved, handed_off, and archived. A safety hold is an independent blocking state. Only the server can make a guide executable.

Make assessments immutable and publish only if their input revision is still current. Old jobs must not overwrite a newer assessment. Duplicate requests with one idempotency key must not trigger duplicate effective work or duplicate user credits.

Use bounded retries with backoff for transient failures. Distinguish invalid configuration from temporary provider outages. Preserve cases during failure. Missing video or shopping data must not destroy an otherwise useful assessment.

14 Privacy, security, and cost controls

Implement authorization for rows, media objects, jobs, exports, and administrative operations. Use private buckets and expiring signed URLs. Enforce ownership when creating signed URLs and completing uploads. Test with two accounts.

Protect file parsers with resource limits. Restrict server fetches to allowed schemes and destinations and block internal network access, unsafe redirects, credentialed URLs, and oversized responses. Sanitize rendered external content.

Treat prompt injection in all input channels as untrusted data. Model tools must be narrowly scoped and cannot run arbitrary shell commands, unrestricted database queries, purchases, or network fetches.

Keep raw symptoms, photos, VINs, and secrets out of ordinary analytics. Do not claim perfect automatic face or plate redaction. No training reuse by default. Document actual processor retention and deletion limitations rather than promising unsupported deletion behavior.

Implement case deletion and an account deletion workflow covering derivatives, indexes, exports, and active shares. Explain backup expiry based on real infrastructure. Safety notices, incident reporting, and deletion are never paid features.

Add per user and global usage limits, provider timeouts, maximum context and images, and server enforced budgets. Reserve and settle usage once per request. Technical retries must not consume multiple user facing case credits. Budget amounts remain configuration; creating code is not permission to incur unbounded spending.

Live charges remain disabled during development. Subscription infrastructure is required: start with plan schemas and entitlement policy in this work package, then implement sandbox checkout and store purchases in Milestone 5. Verify webhook signatures, deduplicate events, handle out of order delivery, and reconcile entitlements from provider state. A checkout return URL is insufficient proof of payment.

15 Development modes and missing dependencies

Keep real adapters, unavailable adapters, and development fixtures distinct. Production must never silently return fixture diagnoses, sample prices, or fake videos.

Provide a clearly labeled local demonstration mode for UI and integration development. It uses synthetic data and is not clinical or mechanical validation. Do not use demo authentication shortcuts in production. Add configuration checks that prevent accidental fixture activation in a public deployment.

When credentials are absent, provide exact setup instructions and unavailable states. Use local services and contract tests where possible, but do not report a real provider integration as tested when only a fixture ran.

External dependencies include inference credentials and budget, database and storage configuration, video API credentials, permitted parts data, qualified mechanical review, and reviewed repair sources. Track these in one integration readiness document.

16 Milestones and acceptance gates

Milestone 1 — Foundation

Implement web and native application shells, navigation, shared design tokens, authentication on all platforms, machine CRUD, machine revisions, repair case persistence, schemas, migrations, database ownership rules, storage policy scaffolding, and local setup. Configure Expo development builds and native identifiers using clearly documented development placeholders until final identifiers are supplied.

Pass when two accounts cannot access each other’s machines or cases, data survives refresh and sign in, unknown machine fields are accepted, and logout removes protected access. A machine created on the website must appear for the same user on both native clients after an authenticated refresh. Sign in, sign out, recovery callbacks, and session restoration must be verified per platform where the test environment permits. Include functioning loading and error states. Do not substitute a localStorage only mock for persistent user records.

Milestone 2 — Evidence intake

Implement browser and native camera and library uploads, validation, processing jobs, private derivatives, symptom forms, safe risk intake, identity confirmation, draft persistence, case revision handling, and job status UI on all three clients. Present a useful case summary without pretending the diagnostic pipeline already exists.

Pass when invalid media is rejected, a failed file retries independently, camera denial has a fallback, evidence remains private, and editing an identity creates a revision. Also verify native permission denial and limited photo access, foreground return, app termination recovery, and cross device revision conflicts. The first work package ends here with runnable web and native clients; report separately any simulator, device, signing, or provider checks that could not run.

Milestone 3 — Real diagnostic flow

Add one configured inference adapter, structured observations, adaptive questions, relevant source retrieval, hypotheses, effective capability policy, safety holds, and persisted assessments. Add an evaluation runner with prompt and model version tracking.

Pass when an unclear engine photo leads to useful clarification without an invented model or part; valid evidence produces a source grounded next action; bad schema output fails safely; malicious image text cannot override policy; and stale jobs cannot overwrite new evidence. Source or reviewer dependent execution remains gated.

Milestone 4 — Resources and repair mode

Implement source backed fitment, real or permitted curated offers, YouTube discovery, guide templates, specification validation, progress, verification, outcomes, and handoff export.

Pass when unsupported fitment cannot gain a verified badge, missing torque blocks a dependent step, no video result is handled honestly, configuration changes invalidate dependent guides, and “Mine looks different” pauses the workflow. Distinguish functioning software from unavailable content coverage.

Milestone 5 — Operational beta and subscription implementation

Implement admin approvals, incident handling, kill switches, cost dashboards, deletion completion, telemetry, accessibility verification, backup and restore procedures, staging deployment preparation, and iOS and Android release preparation. Produce separate readiness checklists for web hosting, TestFlight, Google Play testing, and public store submissions. Do not submit or publish without authorization. Add the complete Free and Pro comparison, usage meter, upgrade flow, sandbox web and store purchasing, restoration, cancellation management, server verification, and cross-platform entitlement tests specified in Section 21. Expert review and a representative held out evaluation set are launch gates, not work the coding agent can self certify.

Milestone 6 — Paid release and expansion

With the USD 14.99 monthly starting price approved, after approval of measured plan limits, provider setup, and launch readiness: activate the already implemented billing flows. Then expand reviewed machine families and later integrations. Subscription implementation cannot be postponed beyond the first public launch; only charging real customers is held until release approval. Audio analysis, OBD hardware, shops, and community content require separate scopes. Native apps are part of the initial release and must already exist; they are not a future expansion item.

17 Required testing

Test meaningful behavior at the appropriate milestone. Run lint, type checks, web builds, native configuration checks, domain unit tests, integration tests, browser flows, and applicable native UI tests. Use a documented native test runner such as Maestro or an equivalent. Building a JavaScript bundle alone does not establish that a native app launches correctly. Report simulator, emulator, physical device, development build, and signed release build results separately. Do not say “all tests pass” if dependencies prevented them from running. Report skipped checks explicitly.

Cover the blueprint’s A01 through A28 scenarios. At minimum, maintain tests for blurry identity, incompatible lookalikes, modified engines, missing critical specifications, unsafe battery reports, new hazards during a guide, absent and metadata only videos, stale prices, skipped checks, failed repairs, conflicting sources, prompt injection, cross account access, duplicate jobs, stale job results, outages, partial uploads, camera denial, unsupported machines, unit conversions, revoked sources, deletion, billing replay when enabled, nonpaywalled safety, keyboard access, wrong model sources, and revision invalidation.

Use deterministic fixtures for validator tests. Use qualified reviewers for mechanical correctness. Do not equate synthetic test coverage or another model’s score with professional validation.

Public release requires no known critical safety failures in the enabled task set, no fabricated links, no uncited critical specifications, and passing authorization tests. A finite passing test set does not justify a universal safety or accuracy claim.

18 Repository deliverables and progress reporting

Create or update these without replacing existing project instructions unnecessarily:

• README with local setup, startup, worker commands, and prerequisites.
• docs/product-scope.md with defaults, supported capabilities, and deferred scope.
• docs/decisions.md with material implementation choices.
• docs/build-status.md with completed gates, current task, and exact next actions.
• docs/integrations.md distinguishing configured, missing, fixture tested, and live tested providers.
• docs/acceptance.md mapping R001–R008 and A01–A28 to checks and status.
• Database migrations, ownership policies, shared schemas, and non production seed data.
• Versioned AI prompts and evaluation fixtures when Milestone 3 begins.
• Deployment, monitoring, recovery, and incident documentation when applicable.
• docs/platform-parity.md mapping each consumer feature to web, iOS, and Android implementation and actual verification status.
• docs/mobile-release.md for identifiers, signing, testing tracks, store metadata, privacy disclosures, review access, and submission blockers.
• Shared API contracts and per-platform authentication, upload, deep link, and session tests.

Keep progress across sessions in those documents. A later session should not need to reconstruct decisions from chat history. Keep messages concise while working.

At the end of each work package, report:

1. What is implemented and how I can try it.
2. What checks ran and their actual results.
3. What is real, fixture based, unavailable, or deferred.
4. Which credentials, source permissions, or human reviews remain necessary.
5. The next milestone and any decision genuinely needed from me.

Begin now by inspecting the project, stating a short plan, and implementing Milestones 1 and 2. Deliver the working result, not just this plan repeated back to me.

19 Native behavior and shared data

Use one backend as the source of truth. Cases started on one device must resume on another after synchronization. Use optimistic concurrency with explicit input revisions. If two devices edit the same case, return a conflict and let the user reconcile changes; never silently lose symptoms, measurements, or completed steps. Acknowledge server persistence separately from local draft persistence.

Use the platform’s protected credential storage for native refresh credentials and supported browser session handling for the web. Do not store credentials in generic unencrypted preference storage. Implement expiry, refresh, logout, session revocation, and clean account switching. A sign out must clear sensitive local caches. Verify authenticated requests on the server regardless of which client sends them.

Support authentication callbacks through correctly configured app links or universal links, with a browser fallback where appropriate. Validate callback destinations, avoid logging tokens, and check authorization when opening a deep-linked case. Use exact allowed redirect URIs for each environment. Development callback schemes are not production identifiers.

Use native camera and photo library APIs with clear permission purpose strings, permission denial handling, limited library access, cancellation, retake, orientation, and supported file conversion. Avoid requesting broad media access when a system picker can satisfy the task. Microphone, Bluetooth, and location permissions are unnecessary for the first scope and should not be requested preemptively.

Persist the upload manifest and recoverable local draft where safe. Mobile operating systems can suspend or terminate the app; do not promise uninterrupted background uploads without implementing and testing the required native capabilities. On return, check server completion before retrying and prevent duplicate uploads or assessments. Recover missing local files with an explicit request to select them again.

The initial offline experience supports a clearly labeled local draft and connection status. AI, current part offers, and safety revalidation require connectivity. Do not queue an executable repair decision as though fresh validation had occurred. Cache only necessary private data with appropriate protection and clear it on logout. Stale guides cannot bypass server holds after reconnecting.

Server jobs continue independently of client foreground state. Poll or subscribe while active, then refresh on app foreground. Push notifications are optional and deferred unless deliberately included; core functionality must not depend on notification permission. If added, keep lock-screen content generic and authorize the destination after opening.

Open merchant and video links through approved external navigation with URL validation. Support private report downloads and the native share sheet only after explicit user action. No sensitive data should be added to a public URL or analytics event.

Maintain backward-compatible API contracts for installed mobile versions. Store releases may lag behind the server. Use schema versions, capability negotiation, and a documented minimum supported client policy. Plan backward-compatible migrations and safe rollout of guide or policy changes rather than assuming every user updates immediately.

20 Coordinated launch and payment readiness

“From day one” means the initial product release includes web, iOS, and Android. It does not mean a single coding session or guaranteed simultaneous store approval. Build all clients throughout the milestones and treat a platform missing a core flow as an incomplete launch deliverable.

Prepare an iOS development build and Android development build, then production build profiles with separate staging and production configuration. Use EAS Build or a documented alternative appropriate to available credentials and authorization. Signing keys and developer accounts remain under the owner’s control. Do not invent account access or mark a build as signed when only an unsigned artifact exists.

Before submission, prepare app name, package identifiers, icons, launch assets, screenshots from actual builds, support and privacy URLs, truthful data disclosures, permission descriptions, age or content declarations, account deletion flows, reviewer instructions and authorized test access. Verify current Apple and Google requirements for the actual feature set and launch regions; do not fabricate legal policy text as though it has been approved. Keep the review backend available and document which real content is accessible.

Test the same primary journey on the website, iPhone, and Android: authenticate, add a machine, upload photos, submit symptoms, answer a question, view permitted resources, save progress, resume on a second device, report an issue, and delete the case. Include cold start, poor connectivity, permission denial, token expiry, concurrent edits, and server outages. Record which checks ran on actual devices and which remain untested.

Live billing stays disabled during development; sandbox subscription implementation is part of this project. Before enabling paid digital access, review the then-current store and regional payment policies before choosing purchase flows or external checkout links. Do not assume a Stripe-only website checkout can simply be copied into native screens. Distinguish purchases of physical repair parts from subscriptions to the app’s digital services.

Use a single server-side entitlement model with provider adapters for whichever payment channels are actually approved. Verify purchases and events on the server; handle restore purchases where applicable, expiry, refunds, revocation, duplicate delivery, account linking, and reconciliation. A client receipt claim or local flag cannot grant paid access. Avoid accidental duplicate subscriptions when a user already has valid access from another channel.

Official implementation references to recheck when building:

• Expo monorepo architecture: https://docs.expo.dev/guides/monorepos/
• Expo builds in a monorepo: https://docs.expo.dev/build-reference/build-with-monorepos/
• Expo links and native routing: https://docs.expo.dev/linking/overview/
• Apple review requirements: https://developer.apple.com/app-store/review/guidelines/
• Google Play payments policy: https://support.google.com/googleplay/android-developer/answer/9858738

21 Free and Pro subscription specification

Product intent and honest differentiation

The owner wants a paid upgraded version with much more usage and more capable assistance. Implement Free and I Fix Everything Pro. Use a monthly auto-renewing subscription as the initial paid product; annual billing can be enabled later after price approval. Do not add multiple confusing paid tiers initially.

Pro should provide deeper investigation, more evidence analysis, and more usage. Both tiers must meet the same standards for accuracy, citation, uncertainty, privacy, and safety. Never intentionally make Free answers wrong, omit a required warning, withhold an essential installation step from a guide already opened, or imply that paying guarantees the correct diagnosis.

Describe the upgrade as “Deeper troubleshooting and higher limits,” not “Guaranteed answers.” A paid model must still ask for missing evidence. Upgrading cannot establish exact part fitment, unlock unsupported dangerous procedures, or override a safety hold.

Proposed development plan configuration

Riley has approved USD 14.99 per month as the Pro starting price. Do not ask for this pricing decision again. Usage allowances remain tunable prototype settings for implementation and cost evaluation; they are not market research or profitability forecasts. Keep the plan in versioned server configuration, not scattered UI constants. Final paid quotas still need validation and approval. Approval of the price does not itself authorize public deployment or charging customers.

|Capability                                                             |Free                        |I Fix Everything Pro                                       |
|-----------------------------------------------------------------------|----------------------------|-----------------------------------------------------------|
|Monthly price                                                          |Free                        |Confirmed starting price USD 14.99 per month               |
|Standard assessment runs per usage period                              |Proposed 3                  |Proposed 100                                               |
|Deep Diagnostic runs per usage period                                  |None                        |Proposed 20                                                |
|Images included in one run                                             |Up to 3                     |Up to 8                                                    |
|Saved machines                                                         |Proposed 1                  |Proposed 10                                                |
|Existing case history and saved guide access                           |Available                   |Available                                                  |
|Supported parts and video discovery                                    |Available for assessed cases|Available plus richer comparisons when sources support them|
|Safety information, incident reports, personal data export and deletion|Always available            |Always available                                           |
|Synchronized account on web iOS Android                                |Included                    |Included                                                   |

A Pro Deep Diagnostic run uses its separate deep allowance, not both allowances. The three Free runs should be sufficient for a limited trial of a real repair journey; measure whether the allowance actually achieves that. One repair may require multiple runs, so do not label the run quota as “100 repairs.”

Free usage periods are calendar months in UTC, with the reset shown in the user’s local time. Pro monthly periods follow verified subscription period boundaries. Define usage windows server side, including exact start and end, and handle renewal or plan changes without resetting already consumed usage incorrectly. If annual billing is introduced, define monthly allocation windows explicitly rather than granting a vague annual pool.

An assessment run is one user-triggered successful standard or deep analysis of a case revision. It may use multiple internal model calls but consumes one allowance unit. A submission that only requests missing identity or unusable-photo clarification does not consume the monthly assessment allowance; still apply reasonable rate and spend controls to prevent abuse. Technical failures, automatic retries, duplicate delivery, and reopening an existing result do not consume additional allowance. A material new analysis requested after new evidence is a new run and must show that clearly before submission.

Deep Diagnostic mode

Add an explicit Standard versus Deep Diagnostic choice for eligible Pro users. Deep mode may use a stronger evaluated reasoning configuration, more applicable source retrieval, more image crops, a more detailed comparison of supported hypotheses, and a second structured consistency check. None of these removes the requirement for applicable evidence.

Give the user a concise initial summary and expandable detail. Cover leading explanations, evidence for and against each, unresolved facts, and the next approved distinguishing check. Preserve the same sourced specification and guide validation rules. More text alone is not a quality upgrade.

Measure this mode against the same held out cases as Standard. Release it only when evaluation supports a useful improvement on complex cases. Set a separate resource budget and latency expectation. If it is unavailable, explain that and offer Standard without consuming a deep run or secretly returning a lower mode under the Deep label.

Unlimited usage policy

Do not advertise “infinite,” “unlimited diagnostics,” or “no limits” for the finite prototype quotas above. The initial recommendation is a clearly stated high allowance because each new analysis can incur compute and retrieval costs. The owner may later approve an uncapped standard-use plan after measuring actual usage and costs.

If uncapped standard usage is later selected, document fair-use restrictions in plain language before purchase: personal interactive use, no automated bulk requests, no account resale, and disclosed concurrency or temporary rate limits. Any separately capped Deep Diagnostic allocation must be visible next to the plan promise. Do not hide an ordinary monthly quota behind “fair use” wording or secretly downgrade answers when an arbitrary spend threshold is reached.

Global operational budget protection still applies. If an outage or service-wide budget incident interrupts paid service, explain the unavailability, preserve progress, and apply the disclosed service policy; do not pretend a finite hidden limit is unlimited access. Reading saved history can be unmetered, but that is not the same as unlimited new AI analysis or unlimited storage.

Purchase and account experience

Provide a clear comparison screen, current plan, remaining Standard and Deep allowance, reset date, billing provider, renewal status, and manage subscription action. Show the actual provider-localized price and billing interval at checkout, with renewal and cancellation terms. Sandbox prototype pricing must be labeled as test pricing. Do not display invented discounts, countdowns, paid user counts, or “most popular” badges without evidence.

Let Free users complete their current view and save their work when they hit a limit. Offer upgrade or wait for reset without deleting drafts or blocking safety information. Do not put upgrade prompts inside an active critical repair instruction. Existing validated guides remain accessible after downgrade, but new analysis follows the current entitlement and all guides remain subject to source revocation or safety holds.

Cancellation stops renewal according to the provider-confirmed state; it is not automatically an immediate loss of prepaid access. At expiry, apply Free allowances for new work while preserving owned data. If saved machines exceed the Free limit, retain them and block additional creation rather than deleting records. Refunds, revocations, grace periods, and payment failures follow verified provider state and the disclosed product policy.

Provide restore purchases where applicable and clear subscription management on the purchase channel. Before opening another checkout, check whether the account already has Pro through any channel. Reconcile account linking securely; do not silently attach one store purchase to arbitrary users or expose billing details to another account.

Backend and payment implementation

Use server verified entitlements for every paid operation. Share one account-level allowance across devices and channels; buying access does not create three separate usage pools. Implement atomic usage reservation and settlement so simultaneous web and native requests cannot overspend the last available run. Expire abandoned reservations safely and reconcile jobs that complete after a network timeout.

For the website, implement a hosted subscription checkout and management adapter such as Stripe in test mode. For native apps, implement platform-appropriate purchase and restoration adapters consistent with the current store and regional policies. A purchase abstraction service can be evaluated if it reduces complexity, but its account, cost, and data processing are explicit dependencies. Do not assume any vendor is already connected.

Persist purchase provider, product identifier, transaction and original transaction references where applicable, subscription state, period boundaries, plan version, and entitlement validity. Verify signed provider events, deduplicate them, and reconcile out-of-order events against authoritative state. Client purchase callbacks cannot grant Pro by themselves. Keep payment information out of model inputs.

The USD 14.99 monthly starting price is approved. No production purchases until final allowances are approved, real provider products are configured consistently with that price, store requirements are checked, end-to-end tests pass, and launch is authorized. The application must nevertheless include working sandbox subscription flows by Milestone 5 rather than a decorative Upgrade button.

Additional subscription acceptance tests

• B01 A client changing its local plan flag cannot access Deep Diagnostic mode.
• B02 Two devices competing for the last allowance unit cannot both consume it.
• B03 Retried or duplicated provider events do not duplicate entitlements or allowances.
• B04 Failed inference releases the reservation; reopening the same result consumes nothing.
• B05 Identity clarification does not use a paid run, but abuse controls still apply.
• B06 A sandbox purchase on an approved channel grants Pro to the same app account across platforms after verification.
• B07 Existing Pro access prevents a misleading second subscription offer.
• B08 Cancellation, expiry, refund, revocation, and grace states follow the provider and preserve the correct data access.
• B09 A downgrade retains saved machines and history rather than deleting excess records.
• B10 Unavailable Deep mode consumes no deep allowance and is labeled honestly.
• B11 A Free user reaching the limit can still view saved guides, safety notices, exports, deletion, and support.
• B12 Renewal and period boundary tests handle timezone display, concurrent requests, and delayed events.
• B13 Checkout displays the real localized provider price and period, not the test-price constant.
• B14 Source or safety invalidation affects both tiers identically; payment cannot unlock a blocked guide.
• B15 The plan comparison never describes finite run allocations as unlimited diagnostics.

Create docs/subscriptions.md with the plan configuration, usage semantics, pricing approval status, provider mapping, lifecycle handling, cost assumptions, and B01–B15 test results. Before suggesting final allowances, measure Standard and Deep median and expensive-tail costs and model the effect of payment processing, store fees where applicable, infrastructure, refunds, and support. Do not state the approved USD 14.99 starting price will be profitable without those measurements.

END PROMPT

────────

Continuation instruction for later sessions

After reviewing the first work package, paste this into Claude Code:

“Read BUILD_PROMPT.md, docs/build-status.md, docs/decisions.md, docs/integrations.md, and docs/acceptance.md. Inspect the actual repository state. Continue with the next incomplete milestone from BUILD_PROMPT.md, preserving all evidence, fitment, safety, privacy, and revision requirements. Implement and verify the milestone rather than only planning it. Finish all unblocked work, record exactly what remains blocked, and stop at the milestone’s reviewable completion boundary. Do not publish, enable live charges, fabricate expert approvals, or replace unavailable integrations with fake production results. Implement sandbox billing when reaching its milestone.”

Remaining decisions Riley can change before using the prompt

The platform is confirmed: website plus iOS and Android from the initial release. Do not ask this again. The name is confirmed as I Fix Everything and a paid upgraded tier is required. The Pro starting price is confirmed at USD 14.99 per month. Color direction, initial category emphasis, and final allowances remain provisional. The development stages are engineering checkpoints, not permission to launch only the website.

Apple and Google developer accounts, final bundle identifiers, signing, privacy disclosures, review access, backend configuration, and source review are release dependencies. They do not prevent local implementation. Public availability depends on actual store review and release readiness; this prompt does not guarantee a simultaneous approval date.
