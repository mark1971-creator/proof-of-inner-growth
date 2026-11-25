// This file is part of example-inner-growth (Being at Full Potential, Proof of Inner Growth).
// SPDX-License-Identifier: Apache-2.0
//
// In-memory tests: the compiled contract runs with compact-runtime, no network
// and no proofs. Every guard has a negative test, and the privacy test reads the
// whole public ledger back and checks no secret appears in it.

import { describe, expect, it } from 'vitest';
import { Sim, assertNotInPublicState, expectRejects } from './sim.js';
import { Contract, ledger, pureCircuits } from '../../contract/managed/inner-growth/contract/index.js';
import { createInnerGrowthPrivateState, witnesses } from '../../contract/witnesses.js';
import { courseIdFromLabel, newIssuerKeyPair, newSecretKey, signPracticeRecord } from '../issuer.js';

const DEPLOYER_COIN_PK = '01'.repeat(32);
const COURSE = courseIdFromLabel('Demo: Inner Development & Sustainability Mindset 2027');
const GOAL = 7n; // 7 of the course's 8 two-week periods
const ORGANIZER_SK = newSecretKey();
const ISSUER = newIssuerKeyPair();

const deploy = () =>
  Sim.deploy({
    contract: new Contract(witnesses),
    ledger,
    coinPublicKey: DEPLOYER_COIN_PK,
    privateState: createInnerGrowthPrivateState(ORGANIZER_SK),
    args: [COURSE, GOAL],
  });

type IgSim = Awaited<ReturnType<typeof deploy>>;

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
const receiptOf = (sim: IgSim, sk: Uint8Array) => pureCircuits.goalReceipt(sk, COURSE, hexToBytes(sim.address));

const asOrganizer = (sim: IgSim) => {
  sim.privateState = createInnerGrowthPrivateState(ORGANIZER_SK);
  return sim;
};

/** As a student whose counts the platform signed with `issuerSk`. */
const asStudent = (sim: IgSim, sk: Uint8Array, periods: bigint, entries: bigint, issuerSk = ISSUER.sk, course = COURSE) => {
  sim.privateState = createInnerGrowthPrivateState(
    sk,
    signPracticeRecord(issuerSk, pureCircuits.studentKey(sk), course, periods, entries),
  );
  return sim;
};

/** A course with the issuer registered and `n` students enrolled. */
const setup = async (n = 3) => {
  const sim = await deploy();
  await sim.call('setIssuer', ISSUER.pk);
  const students = Array.from({ length: n }, () => newSecretKey());
  for (const sk of students) await sim.call('enrol', pureCircuits.studentKey(sk));
  return { sim, students };
};

describe('Proof of Inner Growth (in memory)', () => {
  it('deploys with the course, the goal and the organizer set', async () => {
    const l = (await deploy()).ledger();
    expect(l.courseId).toEqual(COURSE);
    expect(l.periodsRequired).toBe(GOAL);
    expect(l.adminPk).toEqual(pureCircuits.adminKey(ORGANIZER_SK));
    expect(l.enrolled).toBe(0n);
    expect(l.proofs).toBe(0n);
  });

  it('refuses a goal of zero periods', async () => {
    await expectRejects(
      () =>
        Sim.deploy({
          contract: new Contract(witnesses),
          ledger,
          coinPublicKey: DEPLOYER_COIN_PK,
          privateState: createInnerGrowthPrivateState(ORGANIZER_SK),
          args: [COURSE, 0n],
        }),
      'The practice goal must be at least one period',
    );
  });

  it('runs the whole flow: issuer, class list, a student proves the goal, the professor finds the receipt', async () => {
    const { sim, students } = await setup(3);
    expect(sim.ledger().enrolled).toBe(3n);
    await asStudent(sim, students[1], 8n, 14n).call('proveGoalMet');
    const l = sim.ledger();
    expect(l.proofs).toBe(1n);
    expect(l.goalMet.member(receiptOf(sim, students[1]))).toBe(true);
    expect(l.goalMet.member(receiptOf(sim, students[0]))).toBe(false);
  });

  it('accepts exactly the goal', async () => {
    const { sim, students } = await setup(1);
    await asStudent(sim, students[0], GOAL, 7n).call('proveGoalMet');
    expect(sim.ledger().proofs).toBe(1n);
  });

  it('refuses a student below the goal', async () => {
    const { sim, students } = await setup(1);
    await expectRejects(() => asStudent(sim, students[0], GOAL - 1n, 20n).call('proveGoalMet'), 'Practice goal not met yet');
  });

  it('refuses a second proof from the same student', async () => {
    const { sim, students } = await setup(1);
    await asStudent(sim, students[0], 8n, 10n).call('proveGoalMet');
    await expectRejects(() => asStudent(sim, students[0], 8n, 10n).call('proveGoalMet'), 'Proof already submitted');
  });

  it('refuses someone who is not on the class list', async () => {
    const { sim } = await setup(2);
    const outsider = newSecretKey();
    // The witness itself finds no path for an unenrolled key.
    await expectRejects(() => asStudent(sim, outsider, 8n, 10n).call('proveGoalMet'), 'not on the class list');
  });

  it('refuses counts the platform did not sign (a different key)', async () => {
    const { sim, students } = await setup(1);
    const forger = newIssuerKeyPair();
    await expectRejects(() => asStudent(sim, students[0], 8n, 10n, forger.sk).call('proveGoalMet'), 'Invalid attestation signature');
  });

  it('refuses counts edited after signing', async () => {
    const { sim, students } = await setup(1);
    const signed = signPracticeRecord(ISSUER.sk, pureCircuits.studentKey(students[0]), COURSE, 5n, 6n);
    sim.privateState = createInnerGrowthPrivateState(students[0], { ...signed, periodsCovered: 8n });
    await expectRejects(() => sim.call('proveGoalMet'), 'Invalid attestation signature');
  });

  it("refuses another student's signed counts", async () => {
    const { sim, students } = await setup(2);
    const signedForA = signPracticeRecord(ISSUER.sk, pureCircuits.studentKey(students[0]), COURSE, 8n, 9n);
    sim.privateState = createInnerGrowthPrivateState(students[1], signedForA);
    await expectRejects(() => sim.call('proveGoalMet'), 'Invalid attestation signature');
  });

  it('refuses counts signed for another course', async () => {
    const { sim, students } = await setup(1);
    const other = courseIdFromLabel('Another course');
    await expectRejects(() => asStudent(sim, students[0], 8n, 9n, ISSUER.sk, other).call('proveGoalMet'), 'Invalid attestation signature');
  });

  it('refuses a proof before an issuer is registered', async () => {
    const sim = await deploy();
    const sk = newSecretKey();
    await sim.call('enrol', pureCircuits.studentKey(sk));
    await expectRejects(() => asStudent(sim, sk, 8n, 9n).call('proveGoalMet'), 'No issuer registered');
  });

  it('only the organizer can register the issuer or enrol', async () => {
    const { sim, students } = await setup(1);
    sim.privateState = createInnerGrowthPrivateState(students[0]);
    await expectRejects(() => sim.call('setIssuer', newIssuerKeyPair().pk), 'Only the course organizer can do this');
    await expectRejects(() => sim.call('enrol', pureCircuits.studentKey(newSecretKey())), 'Only the course organizer can do this');
  });

  it('refuses enrolling the same student twice', async () => {
    const { sim, students } = await setup(1);
    await expectRejects(() => asOrganizer(sim).call('enrol', pureCircuits.studentKey(students[0])), 'Student already enrolled');
  });

  it('keeps secrets out of public state', async () => {
    const { sim, students } = await setup(2);
    await asStudent(sim, students[0], 8n, 13n).call('proveGoalMet');
    const l = sim.ledger();
    expect(Object.keys(l).sort()).toEqual(['adminPk', 'courseId', 'enrolled', 'goalMet', 'issuers', 'periodsRequired', 'proofs', 'studentKeys', 'students']);
    assertNotInPublicState(l, {
      organizerSecret: ORGANIZER_SK,
      studentSecret0: students[0],
      studentSecret1: students[1],
    });
    // The receipt cannot be matched to the enrolled key it came from.
    const r = receiptOf(sim, students[0]);
    expect(l.studentKeys.member(r)).toBe(false);
  });
});
