---
lang: en
title: 'Interceptors'
keywords: LoopBack 4.0, LoopBack 4
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Interceptors.html
---

## Overview

Interceptors are reusable functions to provide aspect-oriented logic around
method invocations. There are many use cases for interceptors, such as:

- Add extra logic before / after method invocation, for example, logging or
  measuring method invocations.
- Validate/transform arguments
- Validate/transform return values
- Catch/transform errors, for example, normalize error objects
- Override the method invocation, for example, return from cache

## Interceptor functions

The interceptor function has the following signature:

```ts
export interface Interceptor {
  <T>(
    context: InvocationContext,
    next: () => ValueOrPromise<T>,
  ): ValueOrPromise<T>;
}
```

An interceptor is responsible for calling `next()` if it wants to proceed with
next interceptor or the target method invocation.

An interceptor can be synchronous (returning a value) or asynchronous (returning
a promise). If one of the interceptors or the target method is asynchronous, the
invocation will be asynchronous.

### Invocation context

The `InvocationContext` object provides access to metadata for the given
invocation in addition to the parent `Context` that can be used to locate other
bindings.

```ts
/**
 * InvocationContext for method invocations
 */
export class InvocationContext extends Context {
  /**
   * Construct a new instance
   * @param parent Parent context
   * @param target Target class or object
   * @param methodName Method name
   * @param args An array of arguments
   */
  constructor(
    parent: Context,
    public readonly target: object,
    public readonly methodName: string,
    public readonly args: any[],
  ) {
    super(parent);
  }
}
```

It's possible for an interceptor to mutate items in the `args` array to pass in
transformed input to downstream interceptors and the target method.

### Example interceptors

Here are some example interceptor functions:

```ts
// A sync interceptor to log method calls
const logSync: Interceptor = (invocationCtx, next) => {
  console.log('logSync: before-' + invocationCtx.methodName);
  // Calling `next()` without `await`
  const result = next();
  // It's possible that the statement below is executed before downstream
  // interceptors or the target method finish
  console.log('logSync: after-' + invocationCtx.methodName);
  return result;
};

// An async interceptor to log method calls
const log: Interceptor = async (invocationCtx, next) => {
  console.log('log: before-' + invocationCtx.methodName);
  // Wait until the interceptor/method chain returns
  const result = await next();
  console.log('log: after-' + invocationCtx.methodName);
  return result;
};

// An interceptor to catch and log errors
const logError: Interceptor = async (invocationCtx, next) => {
  console.log('logError: before-' + invocationCtx.methodName);
  try {
    const result = await next();
    console.log('logError: after-' + invocationCtx.methodName);
    return result;
  } catch (err) {
    console.log('logError: error-' + invocationCtx.methodName);
    throw err;
  }
};

// An interceptor to convert `name` arg to upper case
const convertName: Interceptor = async (invocationCtx, next) => {
  console.log('convertName: before-' + invocationCtx.methodName);
  invocationCtx.args[0] = (invocationCtx.args[0] as string).toUpperCase();
  const result = await next();
  console.log('convertName: after-' + invocationCtx.methodName);
  return result;
};
```

To leverage dependency injection, a provider class can be defined as the
interceptor:

```ts
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
```

## Apply interceptors

Interceptors form a cascading chain of handlers around the target method
invocation. We can apply interceptors by decorating methods/classes with
`@intercept`.

## @intercept

Syntax: `@intercept(...interceptorFunctionsOrBindingKeys)`

The `@intercept` decorator adds interceptors to a class or its methods including
static and instance methods. Two flavors are accepted:

- An interceptor function

  ```ts
  class MyController {
    @intercept(log) // Use the `log` function
    greet(name: string) {
      return `Hello, ${name}`;
    }
  }
  ```

- A binding key that can be resolved to an interface function

  ```ts
  class MyController {
    @intercept('name-validator') // Use the `name-validator` binding
    async helloWithNameValidation(name: string) {
      return `Hello, ${name}`;
    }
  }

  // Bind options and provider for `NameValidator`
  ctx.bind('valid-names').to(['John', 'Mary']);
  ctx.bind('name-validator').toProvider(NameValidator);
  ```

### Method level interceptors

A static or prototype method on a class can be decorated with `@intercept` to
apply interceptors. For example,

```ts
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

  @intercept(changeName)
  async helloWithChangeName(name: string) {
    return `Hello, ${name}`;
  }

  @intercept(logWithErrorHandling)
  async helloWithError(name: string) {
    throw new Error('error: ' + name);
  }
}
```

### Class level interceptors

To apply interceptors to be invoked for all methods on a class, we can use
`@intercept` to decorate the class. When a method is invoked, class level
interceptors (if not explicitly listed at method level) are invoked before
method level ones.

```ts
@intercept(log)
class MyControllerWithClassLevelInterceptors {
  static async greetStatic(name: string) {
    return `Hello, ${name}`;
  }

  @intercept(log)
  static async greetStaticWithDI(@inject('name') name: string) {
    return `Hello, ${name}`;
  }

  @intercept(log, logSync)
  greetSync(name: string) {
    return `Hello, ${name}`;
  }

  @intercept(convertName, log)
  async greet(name: string) {
    return `Hello, ${name}`;
  }
}
```

Here is the list of interceptors invoked for each method:

- greetStatic: `log`
- greetStaticWithDI: `log`
- greetSync: `log`, `logSync`
- greet: `convertName`, `log`

## Invoke a method with interceptors

Controller methods decorated with `@intercept` are invoked with applied
interceptors for corresponding routes upon API requests.

To explicitly invoke a method with interceptors, use `invokeMethod` from
`@loopback/context`. Please note `invokeMethod` is used internally by
`RestServer` for controller methods.

```ts
import {Context, invokeMethod} from '@loopback/context';

const ctx: Context = new Context();

ctx.bind('name').to('John');

// Invoke a static method
let msg = await invokeMethod(MyController, 'greetStaticWithDI', ctx);

// Invoke an instance method
const controller = new MyController();
msg = await invokeMethod(controller, 'greetWithDI', ctx);
```

Please note interceptors are also supported if the
[method is decorated for parameter injections](Dependency-injection.md##method-injection).
