# Agent Guidelines for FacePace Project

These guidelines describe how the coding agent should behave when
making changes in this repository.

## 1. Safety for Core Flows

- Be **extra careful** with these flows:
  - Offline sync for people + groups.
  - Attendance camera / recognition pipeline.
  - Pending Inbox behavior (including bulk accept).
  - Public enrollment page UX.
- Small, obvious bugfixes are OK without asking first, but:
  - Explain the root cause and the smallest possible fix in chat.
  - For anything larger (UI/logic change), ask the user before editing.

## 2. Minimal, Incremental Changes

- Prefer small, well-scoped edits; avoid big refactors unless the user
  explicitly asks for them.
- When implementing a feature:
  - Touch as few files as reasonably possible.
  - Avoid mixing unrelated cleanups with functional changes.
- After changes, summarize in chat:
  - What changed and where.
  - Any important tradeoffs or follow-ups.

## 3. Documentation / Explanations

- Do **not** create lots of new docs by default.
- Prefer explaining changes and architecture in chat.
- Only update or create docs (e.g. `README_DEPLOYMENT.md`,
  `docs/ONLINE_ROADMAP.md`) when:
  - The user asks for it, or
  - It’s clearly needed (for example, deployment instructions).

## 4. Engine / Model Abstraction

- Treat the face recognition engine (InsightFace now, future SDK later)
  as a pluggable module:
  - Keep engine-specific logic behind a narrow backend interface.
  - Do **not** leak model details into the React frontend or database
    schema beyond generic concepts (embeddings, scores, model_id).

## 5. Asking Before Big Moves

- Always ask the user before:
  - Large UI redesigns.
  - Removing or disabling features.
  - Changing deployment targets (Vercel/Railway/Supabase config).
  - Introducing new external services.

## 6. Testing Mindset

- For non-trivial changes:
  - Describe how to manually test the feature.
  - When possible, run local checks (lint/test) and report failures
    honestly rather than hiding them.


