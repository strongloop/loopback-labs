// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/rest
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  inject,
  intercept,
  Interceptor,
  InvocationContext,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {get, param} from '@loopback/openapi-v3';
import {
  Client,
  createRestAppClient,
  expect,
  givenHttpServerConfig,
} from '@loopback/testlab';
import {Request, RestApplication, RestBindings} from '../../..';

describe('caching interceptor', () => {
  let client: Client;
  let app: RestApplication;
  let returnUpperCaseFromCache = false;
  let returnLowerCaseFromCache = false;

  before(givenAClient);
  after(async () => {
    await app.stop();
  });

  context('toUpperCase with bound caching interceptor', () => {
    it('invokes the controller method if not cached', async () => {
      await client.get('/toUpperCase/Hello').expect(200, 'HELLO');
      expect(returnUpperCaseFromCache).to.be.false();
    });

    it('returns from cache without invoking the controller method', async () => {
      for (let i = 0; i <= 5; i++) {
        await client.get('/toUpperCase/Hello').expect(200, 'HELLO');
        expect(returnUpperCaseFromCache).to.be.true();
      }
    });

    it('invokes the controller method after cache is cleared', async () => {
      CachingInterceptorProvider.clearCache();
      await client.get('/toUpperCase/Hello').expect(200, 'HELLO');
      expect(returnUpperCaseFromCache).to.be.false();
    });
  });

  context('toLowerCase with cache interceptor function', () => {
    it('invokes the controller method if not cached', async () => {
      await client.get('/toLowerCase/Hello').expect(200, 'hello');
      expect(returnLowerCaseFromCache).to.be.false();
    });

    it('returns from cache without invoking the controller method', async () => {
      for (let i = 0; i <= 5; i++) {
        await client.get('/toLowerCase/Hello').expect(200, 'hello');
        expect(returnLowerCaseFromCache).to.be.true();
      }
    });

    it('invokes the controller method after cache is cleared', async () => {
      cachedResults.clear();
      await client.get('/toLowerCase/Hello').expect(200, 'hello');
      expect(returnLowerCaseFromCache).to.be.false();
    });
  });

  async function givenAClient() {
    app = new RestApplication({rest: givenHttpServerConfig()});
    app.bind('caching-interceptor').toProvider(CachingInterceptorProvider);
    app.controller(StringCaseController);
    await app.start();
    client = createRestAppClient(app);
  }

  /**
   * A controller using interceptors for caching
   */
  class StringCaseController {
    @intercept('caching-interceptor')
    @get('/toUpperCase/{text}')
    toUpperCase(@param.path.string('text') text: string) {
      return text.toUpperCase();
    }

    @intercept(cache)
    @get('/toLowerCase/{text}')
    toLowerCase(@param.path.string('text') text: string) {
      return text.toLowerCase();
    }
  }

  /**
   * A provider class for caching interceptor that leverages dependency
   * injection
   */
  class CachingInterceptorProvider implements Provider<Interceptor> {
    private static cache = new Map<string, unknown>();

    static clearCache() {
      this.cache.clear();
    }

    constructor(
      @inject(RestBindings.Http.REQUEST, {optional: true})
      private request: Request | undefined,
    ) {}
    value() {
      return async <T>(
        invocationCtx: InvocationContext,
        next: () => ValueOrPromise<T>,
      ) => {
        returnUpperCaseFromCache = false;

        if (!this.request) {
          // The method is not invoked by an http request, no caching
          return await next();
        }
        const url = this.request.url;
        const cachedValue = CachingInterceptorProvider.cache.get(url);
        if (cachedValue) {
          returnUpperCaseFromCache = true;
          return cachedValue as T;
        }
        const result = await next();
        CachingInterceptorProvider.cache.set(url, result);
        return result;
      };
    }
  }

  /**
   * An interceptor function that caches results. It uses `invocationContext`
   * to locate the http request
   */
  const cachedResults = new Map<string, unknown>();
  async function cache<T>(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<T>,
  ) {
    returnLowerCaseFromCache = false;
    const req = await invocationCtx.get(RestBindings.Http.REQUEST, {
      optional: true,
    });
    if (!req) {
      // The method is not invoked by an http request, no caching
      return await next();
    }
    const url = req.url;
    const cachedValue = cachedResults.get(url);
    if (cachedValue) {
      returnLowerCaseFromCache = true;
      return cachedValue as T;
    }
    const result = await next();
    cachedResults.set(url, result);
    return result;
  }
});
