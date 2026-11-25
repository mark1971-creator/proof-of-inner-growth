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

// What `mnkit deploy` deploys: each contract's constructor arguments and
// initial private state. This file is yours. `mnkit derive` fills the
// @generated-stub regions from the compiled contract until you edit them.
//
// `ctx.deployments` holds the contracts already deployed on the network, so a
// constructor that takes another contract's address (or its token color) can
// read it there. Deploy that contract first: `mnkit deploy <name>`.

import { deployable, type Deployable, type DeployContext } from '../src/deployments.js';
import {
  CompiledInnerGrowthContract,
  type Contract,
  zkConfigPath,
  // @generated-stub begin deploy-imports sha=e3b0c44298fc
  // @generated-stub end deploy-imports
} from './index.js';
import { createInnerGrowthPrivateState } from './witnesses.js';
import { courseIdFromLabel, newSecretKey } from '../src/issuer.js';

export const deployables: Record<string, Deployable<any>> = {
  'inner-growth': deployable<Contract>({
    compiledContract: CompiledInnerGrowthContract,
    zkConfigPath,
    privateStateId: 'InnerGrowthState',
    // @generated-stub begin private-state sha=e86200545281
    initialPrivateState: createInnerGrowthPrivateState(newSecretKey()),
    // @generated-stub end private-state
    args: (ctx: DeployContext) => [
      // @generated-stub begin constructor-args sha=63cc2ae7e997
      courseIdFromLabel('Demo: Inner Development course'),
      7n,
      // @generated-stub end constructor-args
    ],
  }),
  // @generated-stub begin secondary-deploys sha=e3b0c44298fc
  // @generated-stub end secondary-deploys
};
