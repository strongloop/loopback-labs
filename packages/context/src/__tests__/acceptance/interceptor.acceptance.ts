// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  Context,
  inject,
  intercept,
  Interceptor,
  InvocationContext,
  invokeMethod,
  invokeMethodWithInterceptors,
  Provider,
  ValueOrPromise,
} from '../..';

describe('Interceptor', () => {
  let ctx: Context;
  let controller: MyController;
  let controllerWithClassInterceptors: MyControllerWithClassLevelInterceptors;

  beforeEach(givenContextAndController);

  it('invokes sync interceptors', () => {
    const msg = invokeMethodWithInterceptors(ctx, controller, 'greetSync', [
      'John',
    ]);
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'logSync: before-greetSync',
      'logSync: after-greetSync',
    ]);
  });

  it('invokes async interceptors', async () => {
    const msg = await invokeMethodWithInterceptors(ctx, controller, 'greet', [
      'John',
    ]);
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql(['log: before-greet', 'log: after-greet']);
  });

  it('supports interceptor bindings', async () => {
    ctx.bind('log').to(log);
    const msg = await invokeMethodWithInterceptors(ctx, controller, 'hello', [
      'John',
    ]);
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql(['log: before-hello', 'log: after-hello']);
  });

  it('supports interceptor bindings from a provider', async () => {
    ctx.bind('valid-names').to(['John', 'Mary']);
    ctx.bind('name-validator').toProvider(NameValidator);
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'helloWithNameValidation',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(
      invokeMethodWithInterceptors(ctx, controller, 'helloWithNameValidation', [
        'Smith',
      ]),
    ).to.be.rejectedWith(/Name 'Smith' is not on the list/);
  });

  it('invokes a method with two interceptors', async () => {
    ctx.bind('log').to(log);
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'helloWithTwoInterceptors',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-helloWithTwoInterceptors',
      'logSync: before-helloWithTwoInterceptors',
      'logSync: after-helloWithTwoInterceptors',
      'log: after-helloWithTwoInterceptors',
    ]);
  });

  it('invokes a method without interceptors', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'helloWithoutInterceptors',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([]);
  });

  it('allows interceptors to modify args', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'helloWithUpperCaseName',
      ['John'],
    );
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-helloWithUpperCaseName',
      'convertName: after-helloWithUpperCaseName',
    ]);
  });

  it('allows interceptors to catch errors', async () => {
    await expect(
      invokeMethodWithInterceptors(ctx, controller, 'helloWithError', ['John']),
    ).to.be.rejectedWith('error: John');
    expect(events).to.eql([
      'logError: before-helloWithError',
      'logError: error-helloWithError',
    ]);
  });

  it('invokes static interceptors', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      MyController,
      'greetStatic',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-greetStatic',
      'log: after-greetStatic',
    ]);
  });

  context('method dependency injection', () => {
    it('invokes interceptors on a static method', async () => {
      ctx.bind('name').to('John');
      const msg = await invokeMethod(MyController, 'greetStaticWithDI', ctx);
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'log: before-greetStaticWithDI',
        'log: after-greetStaticWithDI',
      ]);
    });

    it('invokes interceptors on an instance method', async () => {
      ctx.bind('name').to('John');
      const msg = await invokeMethod(controller, 'greetWithDI', ctx);
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'log: before-greetWithDI',
        'log: after-greetWithDI',
      ]);
    });
  });

  context('class level interceptors', () => {
    it('invokes sync and async interceptors', async () => {
      const msg = await invokeMethodWithInterceptors(
        ctx,
        controllerWithClassInterceptors,
        'greetSync',
        ['John'],
      );
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'log: before-greetSync',
        'logSync: before-greetSync',
        'logSync: after-greetSync',
        'log: after-greetSync',
      ]);
    });

    it('invokes async interceptors on an async method', async () => {
      const msg = await invokeMethodWithInterceptors(
        ctx,
        controllerWithClassInterceptors,
        'greet',
        ['John'],
      );
      expect(msg).to.equal('Hello, JOHN');
      expect(events).to.eql([
        'convertName: before-greet',
        'log: before-greet',
        'log: after-greet',
        'convertName: after-greet',
      ]);
    });

    it('invokes interceptors on a static method', async () => {
      const msg = await invokeMethodWithInterceptors(
        ctx,
        MyControllerWithClassLevelInterceptors,
        'greetStatic',
        ['John'],
      );
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'log: before-greetStatic',
        'log: after-greetStatic',
      ]);
    });

    it('invokes interceptors on a static method with DI', async () => {
      ctx.bind('name').to('John');
      const msg = await invokeMethod(
        MyControllerWithClassLevelInterceptors,
        'greetStaticWithDI',
        ctx,
      );
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'log: before-greetStaticWithDI',
        'log: after-greetStaticWithDI',
      ]);
    });
  });

  let events: string[];

  const logSync: Interceptor = (invocationCtx, next) => {
    events.push('logSync: before-' + invocationCtx.methodName);
    // Calling `next()` without `await`
    const result = next();
    // It's possible that the statement below is executed before downstream
    // interceptors or the target method finish
    events.push('logSync: after-' + invocationCtx.methodName);
    return result;
  };

  const log: Interceptor = async (invocationCtx, next) => {
    events.push('log: before-' + invocationCtx.methodName);
    const result = await next();
    events.push('log: after-' + invocationCtx.methodName);
    return result;
  };

  const logError: Interceptor = async (invocationCtx, next) => {
    events.push('logError: before-' + invocationCtx.methodName);
    try {
      const result = await next();
      events.push('logError: after-' + invocationCtx.methodName);
      return result;
    } catch (err) {
      events.push('logError: error-' + invocationCtx.methodName);
      throw err;
    }
  };

  const convertName: Interceptor = async (invocationCtx, next) => {
    events.push('convertName: before-' + invocationCtx.methodName);
    invocationCtx.args[0] = (invocationCtx.args[0] as string).toUpperCase();
    const result = await next();
    events.push('convertName: after-' + invocationCtx.methodName);
    return result;
  };

  class NameValidator implements Provider<Interceptor> {
    constructor(@inject('valid-names') private validNames: string[]) {}
    value() {
      return async <T>(
        invocationCtx: InvocationContext,
        next: () => ValueOrPromise<T>,
      ) => {
        const name = invocationCtx.args[0];
        if (!this.validNames.includes(name)) {
          throw new Error(
            `Name '${name}' is not on the list of '${this.validNames}`,
          );
        }
        return await next();
      };
    }
  }

  class MyController {
    @intercept(log)
    static async greetStatic(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    static async greetStaticWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }

    @intercept(logSync)
    greetSync(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    greet(name: string) {
      return `Hello, ${name}`;
    }

    @intercept('log')
    async hello(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    async greetWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }

    @intercept('log', logSync)
    async helloWithTwoInterceptors(name: string) {
      return `Hello, ${name}`;
    }

    async helloWithoutInterceptors(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(convertName)
    async helloWithUpperCaseName(name: string) {
      return `Hello, ${name}`;
    }

    @intercept('name-validator')
    async helloWithNameValidation(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(logError)
    async helloWithError(name: string) {
      throw new Error('error: ' + name);
    }
  }

  @intercept(log)
  class MyControllerWithClassLevelInterceptors {
    static async greetStatic(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    static async greetStaticWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    @intercept(logSync)
    greetSync(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(convertName, log)
    async greet(name: string) {
      return `Hello, ${name}`;
    }
  }

  function givenContextAndController() {
    ctx = new Context();
    events = [];
    controller = new MyController();
    controllerWithClassInterceptors = new MyControllerWithClassLevelInterceptors();
  }
});
