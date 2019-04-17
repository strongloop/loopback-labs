// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  AsyncProxy,
  Context,
  createProxyWithInterceptors,
  inject,
  intercept,
  Interceptor,
} from '../..';

describe('Interception proxy', () => {
  let ctx: Context;

  beforeEach(givenContextAndEvents);

  it('invokes async interceptors on an async method', async () => {
    // Apply `log` to all methods on the class
    @intercept(log)
    class MyController {
      // Apply multiple interceptors. The order of `log` will be preserved as it
      // explicitly listed at method level
      @intercept(convertName, log)
      async greet(name: string) {
        return `Hello, ${name}`;
      }
    }
    const proxy = createProxyWithInterceptors(new MyController(), ctx);
    const msg = await proxy.greet('John');
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-greet',
      'log: before-greet',
      'log: after-greet',
      'convertName: after-greet',
    ]);
  });

  it('creates a proxy that converts sync method to be async', async () => {
    // Apply `log` to all methods on the class
    @intercept(log)
    class MyController {
      // Apply multiple interceptors. The order of `log` will be preserved as it
      // explicitly listed at method level
      @intercept(convertName, log)
      greet(name: string) {
        return `Hello, ${name}`;
      }
    }
    const proxy = createProxyWithInterceptors(new MyController(), ctx);
    const msg = await proxy.greet('John');
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-greet',
      'log: before-greet',
      'log: after-greet',
      'convertName: after-greet',
    ]);
  });

  it('invokes interceptors on a static method', async () => {
    // Apply `log` to all methods on the class
    @intercept(log)
    class MyController {
      // The class level `log` will be applied
      static greetStatic(name: string) {
        return `Hello, ${name}`;
      }
    }
    ctx.bind('name').to('John');
    const proxy = createProxyWithInterceptors(MyController, ctx);
    const msg = await proxy.greetStatic('John');
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-greetStatic',
      'log: after-greetStatic',
    ]);
  });

  it('supports asProxyWithInterceptors resolution option', async () => {
    // Apply `log` to all methods on the class
    @intercept(log)
    class MyController {
      // Apply multiple interceptors. The order of `log` will be preserved as it
      // explicitly listed at method level
      @intercept(convertName, log)
      async greet(name: string) {
        return `Hello, ${name}`;
      }
    }
    ctx.bind('my-controller').toClass(MyController);
    const proxy = await ctx.get<MyController>('my-controller', {
      asProxyWithInterceptors: true,
    });
    const msg = await proxy!.greet('John');
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-greet',
      'log: before-greet',
      'log: after-greet',
      'convertName: after-greet',
    ]);
  });

  it('supports asProxyWithInterceptors resolution option for @inject', async () => {
    // Apply `log` to all methods on the class
    @intercept(log)
    class MyController {
      // Apply multiple interceptors. The order of `log` will be preserved as it
      // explicitly listed at method level
      @intercept(convertName, log)
      async greet(name: string) {
        return `Hello, ${name}`;
      }
    }

    class DummyController {
      constructor(
        @inject('my-controller', {asProxyWithInterceptors: true})
        public readonly myController: AsyncProxy<MyController>,
      ) {}
    }
    ctx.bind('my-controller').toClass(MyController);
    ctx.bind('dummy-controller').toClass(DummyController);
    const dummyController = await ctx.get<DummyController>('dummy-controller');
    const msg = await dummyController.myController.greet('John');
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-greet',
      'log: before-greet',
      'log: after-greet',
      'convertName: after-greet',
    ]);
  });

  let events: string[];

  const log: Interceptor = async (invocationCtx, next) => {
    events.push('log: before-' + invocationCtx.methodName);
    const result = await next();
    events.push('log: after-' + invocationCtx.methodName);
    return result;
  };

  // An interceptor to convert the 1st arg to upper case
  const convertName: Interceptor = async (invocationCtx, next) => {
    events.push('convertName: before-' + invocationCtx.methodName);
    invocationCtx.args[0] = (invocationCtx.args[0] as string).toUpperCase();
    const result = await next();
    events.push('convertName: after-' + invocationCtx.methodName);
    return result;
  };

  function givenContextAndEvents() {
    ctx = new Context();
    events = [];
  }
});
