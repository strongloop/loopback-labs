// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {InterceptorOrKey, mergeInterceptors} from '../..';

describe('mergeInterceptors', () => {
  it('removes duplicate entries from the spec', () => {
    assertMergeAsExpected(['log'], ['cache', 'log'], ['cache', 'log']);
    assertMergeAsExpected(['log'], ['log', 'cache'], ['log', 'cache']);
  });

  it('allows empty array for interceptors', () => {
    assertMergeAsExpected([], ['cache', 'log'], ['cache', 'log']);
    assertMergeAsExpected(['cache', 'log'], [], ['cache', 'log']);
  });

  it('joins two arrays for interceptors', () => {
    assertMergeAsExpected(['cache'], ['log'], ['cache', 'log']);
  });

  function assertMergeAsExpected(
    interceptorsFromSpec: InterceptorOrKey[],
    existingInterceptors: InterceptorOrKey[],
    expectedResult: InterceptorOrKey[],
  ) {
    expect(
      mergeInterceptors(interceptorsFromSpec, existingInterceptors),
    ).to.eql(expectedResult);
  }
});
