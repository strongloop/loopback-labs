// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  asInterceptor,
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
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'greetWithABoundInterceptor',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-greetWithABoundInterceptor',
      'log: after-greetWithABoundInterceptor',
    ]);
  });

  it('supports interceptor bindings from a provider', async () => {
    ctx.bind('valid-names').to(['John', 'Mary']);
    ctx.bind('name-validator').toProvider(NameValidator);
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'greetWithNameValidation',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(
      invokeMethodWithInterceptors(ctx, controller, 'greetWithNameValidation', [
        'Smith',
      ]),
    ).to.be.rejectedWith(/Name 'Smith' is not on the list/);
  });

  it('invokes a method with two interceptors', async () => {
    ctx.bind('log').to(log);
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'greetWithTwoInterceptors',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-greetWithTwoInterceptors',
      'logSync: before-greetWithTwoInterceptors',
      'logSync: after-greetWithTwoInterceptors',
      'log: after-greetWithTwoInterceptors',
    ]);
  });

  it('invokes a method without interceptors', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'greetWithoutInterceptors',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([]);
  });

  it('allows interceptors to modify args', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      controller,
      'greetWithUpperCaseName',
      ['John'],
    );
    expect(msg).to.equal('Hello, JOHN');
    expect(events).to.eql([
      'convertName: before-greetWithUpperCaseName',
      'convertName: after-greetWithUpperCaseName',
    ]);
  });

  it('allows interceptors to catch errors', async () => {
    await expect(
      invokeMethodWithInterceptors(ctx, controller, 'greetWithError', ['John']),
    ).to.be.rejectedWith('error: John');
    expect(events).to.eql([
      'logError: before-greetWithError',
      'logError: error-greetWithError',
    ]);
  });

  it('invokes static interceptors', async () => {
    const msg = await invokeMethodWithInterceptors(
      ctx,
      MyControllerWithStaticMethods,
      'greetStatic',
      ['John'],
    );
    expect(msg).to.equal('Hello, John');
    expect(events).to.eql([
      'log: before-greetStatic',
      'log: after-greetStatic',
    ]);
  });

  it('does not allow @intercept on properties', () => {
    expect(() => {
      // tslint:disable-next-line:no-unused
      class MyControllerWithProps {
        @intercept(log)
        private status: string;
      }
    }).to.throw(/@intercept cannot be used on a property/);
  });

  context('method dependency injection', () => {
    it('invokes interceptors on a static method', async () => {
      ctx.bind('name').to('John');
      const msg = await invokeMethod(
        MyControllerWithStaticMethods,
        'greetStaticWithDI',
        ctx,
      );
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

  context('global interceptors', () => {
    beforeEach(givenGlobalInterceptor);

    it('invokes sync and async interceptors', async () => {
      const msg = await invokeMethodWithInterceptors(
        ctx,
        controllerWithClassInterceptors,
        'greetSync',
        ['John'],
      );
      expect(msg).to.equal('Hello, John');
      expect(events).to.eql([
        'globalLog: before-greetSync',
        'log: before-greetSync',
        'logSync: before-greetSync',
        'logSync: after-greetSync',
        'log: after-greetSync',
        'globalLog: after-greetSync',
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
        'globalLog: before-greet',
        'convertName: before-greet',
        'log: before-greet',
        'log: after-greet',
        'convertName: after-greet',
        'globalLog: after-greet',
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
        'globalLog: before-greetStatic',
        'log: before-greetStatic',
        'log: after-greetStatic',
        'globalLog: after-greetStatic',
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
        'globalLog: before-greetStaticWithDI',
        'log: before-greetStaticWithDI',
        'log: after-greetStaticWithDI',
        'globalLog: after-greetStaticWithDI',
      ]);
    });

    function givenGlobalInterceptor() {
      const globalLog: Interceptor = async (invocationCtx, next) => {
        events.push('globalLog: before-' + invocationCtx.methodName);
        const result = await next();
        events.push('globalLog: after-' + invocationCtx.methodName);
        return result;
      };
      ctx
        .bind('globalLog')
        .to(globalLog)
        .apply(asInterceptor);
    }
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

  // An interceptor to convert the 1st arg to upper case
  const convertName: Interceptor = async (invocationCtx, next) => {
    events.push('convertName: before-' + invocationCtx.methodName);
    invocationCtx.args[0] = (invocationCtx.args[0] as string).toUpperCase();
    const result = await next();
    events.push('convertName: after-' + invocationCtx.methodName);
    return result;
  };

  /**
   * A binding provider class to produce an interceptor that validates the
   * `name` argument
   */
  class NameValidator implements Provider<Interceptor> {
    constructor(@inject('valid-names') private validNames: string[]) {}

    value() {
      const interceptor: Interceptor = (invocationCtx, next) =>
        this.validateName(invocationCtx, next);
      return interceptor;
    }

    async validateName<T>(
      invocationCtx: InvocationContext,
      next: () => ValueOrPromise<T>,
    ) {
      const name = invocationCtx.args[0];
      if (!this.validNames.includes(name)) {
        throw new Error(
          `Name '${name}' is not on the list of '${this.validNames}`,
        );
      }
      return await next();
    }
  }

  class MyController {
    // Apply `logSync` to a sync instance method
    @intercept(logSync)
    greetSync(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `log` to a sync instance method
    @intercept(log)
    greet(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `log` as a binding key to an async instance method
    @intercept('log')
    async greetWithABoundInterceptor(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `log` to an async instance method with parameter injection
    @intercept(log)
    async greetWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }

    // Apply `log` and `logSync` to an async instance method
    @intercept('log', logSync)
    async greetWithTwoInterceptors(name: string) {
      return `Hello, ${name}`;
    }

    // No interceptors are attached
    async greetWithoutInterceptors(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `convertName` to convert `name` arg to upper case
    @intercept(convertName)
    async greetWithUpperCaseName(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `name-validator` backed by a provider class
    @intercept('name-validator')
    async greetWithNameValidation(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `logError` to catch errors
    @intercept(logError)
    async greetWithError(name: string) {
      throw new Error('error: ' + name);
    }
  }

  class MyControllerWithStaticMethods {
    // Apply `log` to a static method
    @intercept(log)
    static async greetStatic(name: string) {
      return `Hello, ${name}`;
    }

    // Apply `log` to a static method with parameter injection
    @intercept(log)
    static async greetStaticWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }
  }

  // Apply `log` to all methods on the class
  @intercept(log)
  class MyControllerWithClassLevelInterceptors {
    // The class level `log` will be applied
    static async greetStatic(name: string) {
      return `Hello, ${name}`;
    }

    @intercept(log)
    static async greetStaticWithDI(@inject('name') name: string) {
      return `Hello, ${name}`;
    }

    // We can apply `@intercept` multiple times on the same method
    // This is needed if a custom decorator is created for `@intercept`
    @intercept(log)
    @intercept(logSync)
    greetSync(name: string) {
      return `Hello, ${name}`;
    }

    // Apply multiple interceptors. The order of `log` will be preserved as it
    // explicitly listed at method level
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
