# SPEC: Proof of Inner Growth

## Purpose

A student proves they met a course's practice goal for inner development (practice in at least N of the
course's periods), with counts signed by the platform. Their entries, their counts and their identity stay
private; only a one-time receipt is published.

## Roles

| Role | Recognised by | Can |
|---|---|---|
| Organizer (professor or program lead) | `adminKey(secretKey())` equals the sealed `adminPk` | register the issuer key, enrol students |
| Issuer (the platform, e.g. BFP) | its Jubjub public key in `issuers[0]` (off chain it signs counts) | nothing on chain; its signature is checked inside `proveGoalMet` |
| Student | `studentKey(secretKey())` is a leaf of `students` | prove the goal once per course |
| Anyone | | read `goalMet` to check a receipt a student gave them |

## Public ledger fields

| Field | Type | Written by | Why public |
|---|---|---|---|
| `adminPk` | `Bytes<32>` (sealed) | constructor | identifies the organizer role without revealing their secret |
| `courseId` | `Bytes<32>` (sealed) | constructor | binds signatures and receipts to one course |
| `periodsRequired` | `Uint<8>` (sealed) | constructor | the goal must be known to students and verifiers |
| `issuers` | `Map<Uint<8>, JubjubPoint>` | `setIssuer` | the key the circuit checks signatures against |
| `students` | `MerkleTree<10, Bytes<32>>` | `enrol` | membership proofs without revealing which leaf |
| `studentKeys` | `Set<Bytes<32>>` | `enrol` | stops double enrolment |
| `enrolled` | `Counter` | `enrol` | class size limit (1024) |
| `goalMet` | `Set<Bytes<32>>` | `proveGoalMet` | the receipts a professor looks up; stops a second proof |
| `proofs` | `Counter` | `proveGoalMet` | how many students proved the goal |

## Private state

`InnerGrowthPrivateState` (contract/witnesses.ts): `secretKey` (32 random bytes, on the participant's device),
and for a student also `periodsCovered`, `entries` and the issuer's `signature` over them, handed to the student
by the platform. The entries themselves never enter this contract.

## Circuits

| Circuit | Caller | Args | Effect | Asserts |
|---|---|---|---|---|
| constructor | organizer | `cid`, `required` | sets `adminPk`, `courseId`, `periodsRequired` | "The practice goal must be at least one period" |
| `setIssuer` | organizer | `pk: JubjubPoint` | `issuers[0] = pk` | "Only the course organizer can do this" |
| `enrol` | organizer | `key: Bytes<32>` | adds the key to `students` and `studentKeys` | "Only the course organizer can do this"; "Student already enrolled"; "Class list is full" |
| `proveGoalMet` | student | none | inserts the receipt into `goalMet`, increments `proofs` | "No issuer registered"; "Path is not for this student"; "Not an enrolled student"; "Invalid attestation signature" (and the Schnorr reduction checks); "Practice goal not met yet"; "Proof already submitted" |

## Witnesses

| Witness | Returns | From private state |
|---|---|---|
| `secretKey` | `Bytes<32>` | `secretKey` |
| `studentPath` | `MerkleTreePath<10, Bytes<32>>` | looked up in the ledger's `students` tree |
| `practiceRecord` | `[Uint<8>, Uint<16>, SchnorrSignature]` | `periodsCovered`, `entries`, `signature` |
| `getSchnorrReduction` | `[Uint<7>, Uint<248>]` | computed (division of the challenge hash by 2^248) |

## Privacy invariants

- Never on chain: the organizer's secret → `organizerSecret`
- Never on chain: a student's secret → `studentSecret`
- Never on chain: a student's counts or entries (only signed and checked inside the proof)
- Never on chain: which enrolled key a receipt belongs to (the receipt is a separate hash of the secret)

## Accepted leaks

- The class size and the enrolled (hashed) keys are public; the organizer knows which student each key is.
- The number of proofs and when each was submitted.
- That a receipt exists: anyone holding a receipt can check it. A student shares theirs only with whom they choose.
- The platform knows the counts, because it signs them. The guarantee is towards the professor, the university
  and the public, and about content.
- A proof is submitted from a wallet; until fees are sponsored, the wallet's address is visible on chain.

## Out of scope

- Fee sponsorship, so students need no wallet of their own.
- Proving in the browser.
- The depth of reflection: the entries a student chooses to share are shared off chain.
- Revoking an enrolment or a proof.

## Test-only contracts

None.
