// This file is part of example-inner-growth.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import {
  deployContract,
  submitCallTx,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider, startWallet } from '../wallet.js';
import pino from 'pino';

import { getConfig } from '../config.js';
import { buildProviders, ledgerState, type InnerGrowthProviders } from '../providers.js';
import { createInnerGrowthPrivateState, type InnerGrowthPrivateState } from '../../contract/witnesses.js';
import { courseIdFromLabel, newIssuerKeyPair, newSecretKey, signPracticeRecord } from '../issuer.js';
import {
  CompiledInnerGrowthContract,
  Contract,
  ledger,
  pureCircuits,
  zkConfigPath,
  // @generated-stub begin contract-imports sha=e3b0c44298fc
  // @generated-stub end contract-imports
} from '../../contract/index.js';
// Shielded-coin helpers, imported here when a circuit takes a coin or a
// second contract mints them. See ./coins.ts.
// @generated-stub begin coin-imports sha=e3b0c44298fc
// @generated-stub end coin-imports

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'AliceInnerGrowthState';
// The course, the goal (7 of 8 two-week periods), the organizer, the platform's
// signing key and two students. Fresh every run, so each run is a new course.
const COURSE = courseIdFromLabel(`Demo course ${Date.now()}`);
const GOAL = 7n;
const ORGANIZER_SK = newSecretKey();
const ISSUER = newIssuerKeyPair();
const STUDENT_SKS = [newSecretKey(), newSecretKey()];
const STUDENT_IDS = ['StudentAState', 'StudentBState'];
const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const network = process.env['MIDNIGHT_NETWORK'] ?? 'local';

describe(`Inner Growth Contract (${network})`, () => {
  let wallet: MidnightWalletProvider;
  let providers: InnerGrowthProviders;
  let contractAddress: ContractAddress;
  // @generated-stub begin contract-providers sha=e3b0c44298fc
  // @generated-stub end contract-providers

  const config = getConfig();
  const isRemote = network !== 'local';
  // A wallet syncs from genesis the first time (saved state makes later runs
  // fast): the timeout covers that first sync.
  const syncTimeoutMs = Number(
    process.env['MIDNIGHT_SYNC_TIMEOUT_MS'] ?? (isRemote ? 120 * 60_000 : 10 * 60_000),
  );

  // Reads the contract's public ledger state.
  // @generated-stub begin ledger-fields sha=c68ed8296bb9
  // Public ledger fields:
  //   adminPk: Bytes<32>
  //   courseId: Bytes<32>
  //   periodsRequired: Uint<0..255>
  //   issuers: Map<Uint<0..255>, JubjubPoint>
  //   students: MerkleTree
  //   studentKeys: Set
  //   enrolled: Counter
  //   goalMet: Set
  //   proofs: Counter
  // @generated-stub end ledger-fields
  async function queryLedger() {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(ledgerState(state));
  }

  beforeAll(async () => {
    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };

    // Locally this is the genesis-funded Alice seed. On a remote network it is
    // the shared Alice wallet from the repo-root .env.<network>, which syncs
    // from genesis (about 6 minutes on preprod).
    // startWallet builds, starts and syncs it, and on a remote network waits
    // until it is funded. A second wallet (a tipper, a bidder) is two lines:
    //   bob = await startWallet(logger, envConfig, { network, role: 'BOB', faucet: config.faucet, syncTimeoutMs });
    //   bobProviders = buildProviders(bob, zkConfigPath, config);
    wallet = await startWallet(logger, envConfig, { network, faucet: config.faucet, syncTimeoutMs });

    providers = buildProviders(wallet, zkConfigPath, config);
    // @generated-stub begin contract-providers-init sha=e3b0c44298fc
    // @generated-stub end contract-providers-init
    logger.info(`Providers initialized on '${network}'. Ready to test!`);
  });

  afterAll(async () => {
    if (wallet) {
      logger.info('Stopping wallet...');
      await wallet.stop();
    }
  });

  // ---------------------------------------------------------------------------
  // Everything above is generated boilerplate. Your tests begin here.
  // ---------------------------------------------------------------------------

  // Other contracts first: a test-only token usually feeds this contract's
  // constructor (its token color, say).
  // @generated-stub begin contract-deploys sha=e3b0c44298fc
  // @generated-stub end contract-deploys

  it('deploys the contract', async () => {
    const deployed: DeployedContract<Contract> = await deployContract(providers, {
      compiledContract: CompiledInnerGrowthContract,
      privateStateId: PRIVATE_STATE_ID,
      // @generated-stub begin private-state sha=83099997f723
      initialPrivateState: createInnerGrowthPrivateState(ORGANIZER_SK),
      // @generated-stub end private-state
      // @generated-stub begin constructor-args sha=d8aa0dd829a4
      args: [
        COURSE,
        GOAL,
      ],
      // @generated-stub end constructor-args
    });

    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();
    expect(contractAddress.length).toBeGreaterThan(0);
  });

  const call = (privateStateId: string, circuitId: 'setIssuer' | 'enrol' | 'proveGoalMet', args: unknown[]) =>
    submitCallTx(providers, {
      compiledContract: CompiledInnerGrowthContract,
      contractAddress,
      privateStateId,
      circuitId,
      args,
    } as never);

  const setPrivateState = (id: string, state: InnerGrowthPrivateState) =>
    providers.privateStateProvider.forContract(contractAddress).set(id, state);

  it('registers the platform key and enrols two students', async () => {
    await call(PRIVATE_STATE_ID, 'setIssuer', [ISSUER.pk]);
    for (const sk of STUDENT_SKS) await call(PRIVATE_STATE_ID, 'enrol', [pureCircuits.studentKey(sk)]);
    const l = await queryLedger();
    expect(l.enrolled).toBe(2n);
    expect(l.issuers.member(0n)).toBe(true);
  });

  it('a student proves the practice goal with a real ZK proof; only a receipt lands on chain', async () => {
    const sk = STUDENT_SKS[0];
    const record = signPracticeRecord(ISSUER.sk, pureCircuits.studentKey(sk), COURSE, 8n, 14n);
    await setPrivateState(STUDENT_IDS[0], createInnerGrowthPrivateState(sk, record));
    const t0 = Date.now();
    const tx = await call(STUDENT_IDS[0], 'proveGoalMet', []);
    logger.info(`proveGoalMet accepted in ${Math.round((Date.now() - t0) / 1000)} s, tx ${JSON.stringify((tx as any)?.public?.txId ?? (tx as any)?.public?.txHash ?? '')}`);
    const l = await queryLedger();
    expect(l.proofs).toBe(1n);
    const receipt = pureCircuits.goalReceipt(sk, COURSE, hexToBytes(contractAddress));
    expect(l.goalMet.member(receipt)).toBe(true);
  });

  it('a student below the goal is refused before anything is submitted', async () => {
    const sk = STUDENT_SKS[1];
    const record = signPracticeRecord(ISSUER.sk, pureCircuits.studentKey(sk), COURSE, 5n, 6n);
    await setPrivateState(STUDENT_IDS[1], createInnerGrowthPrivateState(sk, record));
    await expect(call(STUDENT_IDS[1], 'proveGoalMet', [])).rejects.toThrow();
    expect((await queryLedger()).proofs).toBe(1n);
  });
});
