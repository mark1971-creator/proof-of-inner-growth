// This file is part of example-inner-growth (Being at Full Potential, Proof of Inner Growth).
// SPDX-License-Identifier: Apache-2.0
//
// The off-chain inputs the circuits use. Witness output is UNTRUSTED from the
// circuit's point of view: the secret is only used through hashes, the path is
// checked against the on-chain class list, and the practice counts are only
// accepted with a valid issuer signature over them. Runs in the browser too, so
// no `node:*` imports here.
import { type Ledger, type Witnesses } from './managed/inner-growth/contract/index.js';
import { type WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';

// Mirrors the generated `Schnorr_SchnorrSignature`: a JubjubPoint crosses the TS
// boundary as its affine coordinates.
export type SchnorrSignature = {
  announcement: { x: bigint; y: bigint };
  response: bigint;
};

// What a participant keeps on their own device. The organizer only needs the
// secret. A student also holds the counts the platform signed for them and the
// signature: never their entries, which this contract never sees.
export type InnerGrowthPrivateState = {
  readonly secretKey: Uint8Array;
  readonly periodsCovered: bigint;
  readonly entries: bigint;
  readonly signature: SchnorrSignature;
};

const NO_SIGNATURE: SchnorrSignature = { announcement: { x: 0n, y: 0n }, response: 0n };

export const createInnerGrowthPrivateState = (
  secretKey: Uint8Array,
  record?: { periodsCovered: bigint; entries: bigint; signature: SchnorrSignature },
): InnerGrowthPrivateState => {
  if (secretKey.length !== 32) throw new Error('secretKey must be 32 bytes');
  return {
    secretKey,
    periodsCovered: record?.periodsCovered ?? 0n,
    entries: record?.entries ?? 0n,
    signature: record?.signature ?? NO_SIGNATURE,
  };
};

// 2^248: schnorr.compact truncates the challenge hash to 248 bits.
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;

// @generated-stub begin witnesses sha=63a340b3ca4f
export const witnesses: Witnesses<InnerGrowthPrivateState> = {
  // Witness-assisted division; the circuit re-checks q * 2^248 + r == hash.
  getSchnorrReduction: ({ privateState }, challengeHash) => [
    privateState,
    [challengeHash / TWO_248, challengeHash % TWO_248],
  ],
  secretKey: ({ privateState }) => [privateState, privateState.secretKey],
  // Looked up in the class list of the ledger state the circuit runs against,
  // so it always matches the root `proveGoalMet` checks.
  studentPath: ({ privateState, ledger }, key) => {
    const path = ledger.students.findPathForLeaf(key);
    if (path === undefined) throw new Error('This student is not on the class list');
    return [privateState, path];
  },
  practiceRecord: ({ privateState }) => [
    privateState,
    [privateState.periodsCovered, privateState.entries, privateState.signature],
  ],
};
// @generated-stub end witnesses

export type { Ledger, Witnesses, WitnessContext };
