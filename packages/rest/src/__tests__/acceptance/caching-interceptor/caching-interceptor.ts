// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  inject,
  Interceptor,
  InvocationContext,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {Request, RestBindings} from '../../..';

/**
 * Execution status
 */
export const status = {
  returnFromCache: false,
};

/**
 * An interceptor function that caches results. It uses `invocationContext`
 * to locate the http request
 */
export const cachedResults = new Map<string, unknown>();

/**
 * Reset the cache
 */
export function clearCache() {
  status.returnFromCache = false;
  cachedResults.clear();
}

/**
 * A provider class for caching interceptor that leverages dependency
 * injection
 */
export class CachingInterceptorProvider implements Provider<Interceptor> {
  constructor(
    @inject(RestBindings.Http.REQUEST, {optional: true})
    private request: Request | undefined,
  ) {}
  value() {
    return <T>(
      invocationCtx: InvocationContext,
      next: () => ValueOrPromise<T>,
    ) => this.intercept(invocationCtx, next);
  }

  async intercept<T>(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<T>,
  ) {
    status.returnFromCache = false;

    if (!this.request) {
      // The method is not invoked by an http request, no caching
      return await next();
    }
    const url = this.request.url;
    const cachedValue = cachedResults.get(url);
    if (cachedValue) {
      status.returnFromCache = true;
      return cachedValue as T;
    }
    const result = await next();
    cachedResults.set(url, result);
    return result;
  }
}

/**
 * An interceptor function for caching
 * @param invocationCtx
 * @param next
 */
export async function cache<T>(
  invocationCtx: InvocationContext,
  next: () => ValueOrPromise<T>,
) {
  status.returnFromCache = false;
  const req = await invocationCtx.get(RestBindings.Http.REQUEST, {
    optional: true,
  });
  if (!req || req.method.toLowerCase() !== 'get') {
    // The method is not invoked by an http request, no caching
    return await next();
  }
  const url = req.url;
  const cachedValue = cachedResults.get(url);
  if (cachedValue) {
    status.returnFromCache = true;
    return cachedValue as T;
  }
  const result = await next();
  cachedResults.set(url, result);
  return result;
}
