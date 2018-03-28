// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/authorization
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Context, BindingAddress} from '@loopback/context';

/**
 * Voting decision for the authorization decision
 */
export enum VotingDecision {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  ABSTAIN = 'ABSTAIN',
}

/**
 * A voter function
 */
export interface Voter {
  (ctx: Context): Promise<VotingDecision>;
}

export const EVERYONE = '$everyone';
export const AUTHENTICATED = '$authenticated';
export const UNAUTHENTICATED = '$unauthenticated';
export const ANONYMOUS = '$anonymous';

/**
 * Authorization metadata stored via Reflection API
 */
export interface AuthorizationMetadata {
  /**
   * Roles that are allowed access
   */
  allowedRoles?: string[];
  /**
   * Roles that are denied access
   */
  deniedRoles?: string[];
  /**
   * Define the access scopes
   */
  scopes?: string[];
  /**
   * Voters that help make the authorization decision
   */
  voters?: (Voter | BindingAddress<Voter>)[];
}
