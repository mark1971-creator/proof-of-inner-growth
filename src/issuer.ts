// This file is part of example-inner-growth (Being at Full Potential, Proof of Inner Growth).
// SPDX-License-Identifier: Apache-2.0
//
// The platform side: BFP signs a student's practice COUNTS for one course,
// never their content. Schnorr on Jubjub, as in zk-loan's attestation API
// (signing.ts there), using the contract's own pure circuits so the message
// and challenge match the circuit exactly.
//
//   message = [periods covered, total entries, studentKeyHash(student key), courseHash(course id)]
//
// The student key in the message binds the signature to one student: nobody
// else can use it. The course hash binds it to one course.
import * as crypto from 'node:crypto';
import { ecMulGenerator, type JubjubPoint } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { pureCircuits } from '../contract/index.js';
import { type SchnorrSignature } from '../contract/witnesses.js';

export const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
const reduce = (x: bigint): bigint => ((x % JUBJUB_ORDER) + JUBJUB_ORDER) % JUBJUB_ORDER;
const randomScalar = (): bigint => BigInt('0x' + crypto.randomBytes(32).toString('hex')) % JUBJUB_ORDER;

export function newIssuerKeyPair(): { sk: bigint; pk: JubjubPoint } {
  const sk = randomScalar();
  return { sk, pk: ecMulGenerator(sk) };
}

export const newSecretKey = (): Uint8Array => new Uint8Array(crypto.randomBytes(32));

/** A course id from a readable label, e.g. "HSG Inner Development HS27". */
export const courseIdFromLabel = (label: string): Uint8Array =>
  new Uint8Array(crypto.createHash('sha256').update(`bfp-pog:course:${label}`).digest());

export function practiceMessage(periods: bigint, entries: bigint, studentKey: Uint8Array, courseId: Uint8Array): bigint[] {
  return [periods, entries, pureCircuits.studentKeyHash(studentKey), pureCircuits.courseHash(courseId)];
}

export function sign(sk: bigint, msg: bigint[]): SchnorrSignature {
  sk = reduce(sk);
  const pk = ecMulGenerator(sk);
  const k = randomScalar(); // fresh per signature: reusing a nonce leaks the key
  const R = ecMulGenerator(k);
  const c = pureCircuits.schnorrChallenge(R.x, R.y, pk.x, pk.y, msg) % TWO_248;
  return { announcement: R, response: reduce(k + c * sk) };
}

/** What the platform hands a student: their counts and its signature over them. */
export function signPracticeRecord(
  issuerSk: bigint,
  studentKey: Uint8Array,
  courseId: Uint8Array,
  periodsCovered: bigint,
  entries: bigint,
): { periodsCovered: bigint; entries: bigint; signature: SchnorrSignature } {
  return {
    periodsCovered,
    entries,
    signature: sign(issuerSk, practiceMessage(periodsCovered, entries, studentKey, courseId)),
  };
}
