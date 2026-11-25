# Proof of Inner Growth

A student proves they met a course's practice goal for inner development, with a zero-knowledge proof,
without revealing what they wrote, how much they practiced, or which enrolled student they are.

This project is built on the Midnight Network.

By [Being at Full Potential](https://beingatfullpotential.io), a platform for inner development inspired by
the Inner Development Goals. Demo video: *(link to follow)*.

## Why

Inner development (self-awareness, presence, character) is becoming part of university courses. But grading
it creates a dilemma: the only way to assess reflection today is to read it, and when students know their
teacher reads every entry, reflection turns into a performance. Some courses already grade the *process*:
how often students practice, not what they write. This contract makes that provable without anyone reading
the diary.

## How it works

1. **The course organizer deploys one contract per course**, with a course id and a practice goal: the number
   of periods (for example 7 of 8 two-week blocks) that need at least one practice entry.
2. **The organizer registers the platform's signing key** and enrols each student by a hashed key that the
   student's device derives from a secret only the student holds.
3. **The platform signs counts, never content:** `[periods covered, total entries, hash(student key), hash(course id)]`,
   Schnorr on Jubjub (`src/issuer.ts`).
4. **The student proves, inside the circuit** (`proveGoalMet`):
   - they are on the class list (Merkle membership, without saying which entry)
   - the counts carry a valid platform signature bound to them and this course
   - periods covered ≥ the goal
5. **Only a receipt goes on chain**, a hash of the student's secret, the course and the contract. The student
   gives it to the professor off chain; the professor looks it up in `goalMet`. A second proof is refused.

The entries a student chooses to share for the *depth* of their work are shared off chain, by the student.

**Never on chain:** the student's secret, their counts, their entries, and which enrolled key a receipt
belongs to. The privacy test reads the whole public ledger back and checks this (`src/test/inner-growth.sim.test.ts`).

## Status

A prototype, not production code. Tested:

- 15 in-memory tests: the full flow and every guard (below the goal, second proof, not enrolled, forged or
  edited counts, another student's counts, another course, no issuer, non-organizer calls, double enrolment)
  and the privacy invariants.
- End to end on a local Midnight network and on Midnight's **Preview** test network (2026-11-25): deploy,
  register the platform key, enrol two students, one student proves the goal (proof made in about 19 s on a
  local proof server), a student below the goal is refused.

Not done yet: fee sponsorship (so students need no wallet), proving in the browser, a security review.

## Run it

Needs Linux or WSL, Node 22, Docker, and the Compact compiler 0.36.1
([install](https://docs.midnight.network/getting-started/installation)).

```bash
npm install
npm run compile:fast && npm run typecheck && npm run test:sim   # seconds, no Docker
npm run validate          # full compile with ZK keys, local network, end-to-end test (a few minutes)
```

Preview test network: copy `.env.preview.example` to `.env.preview`, put in a fresh wallet seed, fund its address
at the [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/), start a proof server
(`npm run proof:up`), then `npm run test:preview`. The first run waits for the wallet's DUST to build up.

## Credits

Built on Midnight's official [midnight-examples](https://github.com/midnightntwrk/midnight-examples): the project
layout, test harness and wallet code come from its template; the Schnorr verifier (`contract/schnorr.compact`)
is copied from its **zk-loan** example; the class list and one-time receipt follow its **voting** example.

Licensed under Apache-2.0 (`LICENSE`). See `NOTICE`.
