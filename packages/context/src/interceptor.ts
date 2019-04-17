// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  ClassDecoratorFactory,
  DecoratorFactory,
  MetadataAccessor,
  MetadataInspector,
  MetadataMap,
  MethodDecoratorFactory,
} from '@loopback/metadata';
import * as assert from 'assert';
import * as debugFactory from 'debug';
import {Binding} from './binding';
import {filterByTag} from './binding-filter';
import {BindingAddress} from './binding-key';
import {Context} from './context';
import {ContextTags} from './keys';
import {transformValueOrPromise, ValueOrPromise} from './value-promise';
const debug = debugFactory('loopback:context:interceptor');
const getTargetName = DecoratorFactory.getTargetName;

/**
 * Array of arguments for a method invocation
 */
// tslint:disable-next-line:no-any
export type InvocationArgs = any[];

/**
 * Return value for a method invocation
 */
// tslint:disable-next-line:no-any
export type InvocationResult = any;

/**
 * A type for class or its prototype
 */
// tslint:disable-next-line:no-any
type ClassOrPrototype = any;

/**
 * InvocationContext represents the context to invoke interceptors for a method.
 * The context can be used to access metadata about the invocation as well as
 * other dependencies.
 */
export class InvocationContext extends Context {
  /**
   * Construct a new instance of `InvocationContext`
   * @param parent Parent context, such as the RequestContext
   * @param target Target class (for static methods) or prototype/object
   * (for instance methods)
   * @param methodName Method name
   * @param args An array of arguments
   */
  constructor(
    parent: Context,
    public readonly target: object,
    public readonly methodName: string,
    public readonly args: InvocationArgs,
  ) {
    super(parent);
  }

  /**
   * Discover all binding keys for global interceptors (tagged by
   * ContextTags.GLOBAL_INTERCEPTOR)
   */
  getGlobalInterceptorBindingKeys(): string[] {
    return this.find(filterByTag(ContextTags.GLOBAL_INTERCEPTOR)).map(
      b => b.key,
    );
  }
}

/**
 * The `BindingTemplate` function to configure a binding as a global interceptor
 * by tagging it with `ContextTags.INTERCEPTOR`
 * @param binding Binding object
 */
export function asGlobalInterceptor(binding: Binding<unknown>) {
  return binding.tag(ContextTags.GLOBAL_INTERCEPTOR);
}

/**
 * Interceptor function to intercept method invocations
 */
export interface Interceptor {
  /**
   * @param context Invocation context
   * @param next A function to invoke next interceptor or the target method
   * @returns A result as value or promise
   */
  (
    context: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ): ValueOrPromise<InvocationResult>;
}

/**
 * Interceptor function or binding key that can be used as parameters for
 * `@intercept()`
 */
export type InterceptorOrKey = BindingAddress<Interceptor> | Interceptor;

/**
 * Metadata key for method-level interceptors
 */
export const INTERCEPT_METHOD_KEY = MetadataAccessor.create<
  InterceptorOrKey[],
  MethodDecorator
>('intercept:method');

/**
 * Adding interceptors from the spec to the front of existing ones. Duplicate
 * entries are eliminated from the spec side.
 *
 * For example:
 *
 * - [log] + [cache, log] => [cache, log]
 * - [log] + [log, cache] => [log, cache]
 * - [] + [cache, log] => [cache, log]
 * - [cache, log] + [] => [cache, log]
 * - [log] + [cache] => [log, cache]
 *
 * @param interceptorsFromSpec Interceptors from `@intercept`
 * @param existingInterceptors Interceptors already applied for the method
 */
export function mergeInterceptors(
  interceptorsFromSpec: InterceptorOrKey[],
  existingInterceptors: InterceptorOrKey[],
) {
  const interceptorsToApply = new Set(interceptorsFromSpec);
  const appliedInterceptors = new Set(existingInterceptors);
  // Remove interceptors that already exist
  for (const i of interceptorsToApply) {
    if (appliedInterceptors.has(i)) {
      interceptorsToApply.delete(i);
    }
  }
  // Add existing interceptors after ones from the spec
  for (const i of appliedInterceptors) {
    interceptorsToApply.add(i);
  }
  return Array.from(interceptorsToApply);
}

/**
 * Metadata key for method-level interceptors
 */
export const INTERCEPT_CLASS_KEY = MetadataAccessor.create<
  InterceptorOrKey[],
  ClassDecorator
>('intercept:class');

/**
 * A factory to define `@intercept` for classes. It allows `@intercept` to be
 * used multiple times on the same class.
 */
class InterceptClassDecoratorFactory extends ClassDecoratorFactory<
  InterceptorOrKey[]
> {
  protected mergeWithOwn(ownMetadata: InterceptorOrKey[], target: Object) {
    ownMetadata = ownMetadata || [];
    return mergeInterceptors(this.spec, ownMetadata);
  }
}

/**
 * A factory to define `@intercept` for methods. It allows `@intercept` to be
 * used multiple times on the same method.
 */
class InterceptMethodDecoratorFactory extends MethodDecoratorFactory<
  InterceptorOrKey[]
> {
  protected mergeWithOwn(
    ownMetadata: MetadataMap<InterceptorOrKey[]>,
    target: Object,
    methodName: string,
    methodDescriptor: TypedPropertyDescriptor<unknown>,
  ) {
    ownMetadata = ownMetadata || {};
    const interceptors = ownMetadata[methodName] || [];

    // Adding interceptors to the list
    ownMetadata[methodName] = mergeInterceptors(this.spec, interceptors);

    return ownMetadata;
  }
}

/**
 * Decorator function `@intercept` for classes/methods to apply interceptors. It
 * can be applied on a class and its public methods. Multiple occurrences of
 * `@intercept` are allowed on the same target class or method. The decorator
 * takes a list of `interceptor` functions or binding keys. For example:
 *
 * ```ts
 * @intercept(log, metrics)
 * class MyController {
 *   @intercept('caching-interceptor')
 *   @intercept('name-validation-interceptor')
 *   greet(name: string) {
 *     return `Hello, ${name}`;
 *   }
 * }
 * ```
 *
 * @param interceptorOrKeys One or more interceptors or binding keys that are
 * resolved to be interceptors
 */
export function intercept(...interceptorOrKeys: InterceptorOrKey[]) {
  return function interceptDecoratorForClassOrMethod(
    target: ClassOrPrototype,
    method?: string,
    methodDescriptor?: TypedPropertyDescriptor<unknown>,
  ) {
    if (method && methodDescriptor) {
      // Method
      return InterceptMethodDecoratorFactory.createDecorator(
        INTERCEPT_METHOD_KEY,
        interceptorOrKeys,
      )(target, method, methodDescriptor!);
    }
    if (typeof target === 'function' && !method && !methodDescriptor) {
      // Class
      return InterceptClassDecoratorFactory.createDecorator(
        INTERCEPT_CLASS_KEY,
        interceptorOrKeys,
      )(target);
    }
    // Not on a class or method
    throw new Error(
      '@intercept cannot be used on a property: ' +
        DecoratorFactory.getTargetName(target, method, methodDescriptor),
    );
  };
}

/**
 * Invoke a method with the given context
 * @param context Context object
 * @param target Target class (for static methods) or object (for instance methods)
 * @param methodName Method name
 * @param args An array of argument values
 */
export function invokeMethodWithInterceptors(
  context: Context,
  target: object,
  methodName: string,
  args: InvocationArgs,
): ValueOrPromise<InvocationResult> {
  const invocationCtx = new InvocationContext(
    context,
    target,
    methodName,
    args,
  );

  assertMethodExists(invocationCtx);
  const interceptors = loadInterceptors(invocationCtx);
  return invokeInterceptors(invocationCtx, interceptors);
}

/**
 * Load all interceptors for the given invocation context. It adds
 * interceptors from possibly three sources:
 * 1. method level `@intercept`
 * 2. class level `@intercept`
 * 3. global interceptors discovered in the context
 *
 * @param invocationCtx Invocation context
 */
function loadInterceptors(invocationCtx: InvocationContext) {
  let interceptors =
    MetadataInspector.getMethodMetadata(
      INTERCEPT_METHOD_KEY,
      invocationCtx.target,
      invocationCtx.methodName,
    ) || [];
  const targetClass =
    typeof invocationCtx.target === 'function'
      ? invocationCtx.target
      : invocationCtx.target.constructor;
  const classInterceptors =
    MetadataInspector.getClassMetadata(INTERCEPT_CLASS_KEY, targetClass) || [];
  // Inserting class level interceptors before method level ones
  interceptors = mergeInterceptors(classInterceptors, interceptors);
  const globalInterceptors = invocationCtx.getGlobalInterceptorBindingKeys();
  // Inserting global interceptors
  interceptors = mergeInterceptors(globalInterceptors, interceptors);
  return interceptors;
}

/**
 * Invoke the target method with the given context
 * @param context Invocation context
 */
function invokeTargetMethod(context: InvocationContext) {
  const targetWithMethods = assertMethodExists(context);
  /* istanbul ignore if */
  if (debug.enabled) {
    debug(
      'Invoking method %s',
      getTargetName(context.target, context.methodName),
      context.args,
    );
  }
  // Invoke the target method
  const result = targetWithMethods[context.methodName](...context.args);
  /* istanbul ignore if */
  if (debug.enabled) {
    debug(
      'Method invoked: %s',
      getTargetName(context.target, context.methodName),
      result,
    );
  }
  return result;
}

/**
 * Assert the method exists on the target. An error will be thrown if otherwise.
 * @param context Invocation context
 */
function assertMethodExists(context: InvocationContext) {
  const targetWithMethods = context.target as Record<string, Function>;
  if (typeof targetWithMethods[context.methodName] !== 'function') {
    const targetName = getTargetName(context.target, context.methodName);
    assert(false, `Method ${targetName} not found`);
  }
  return targetWithMethods;
}

/**
 * Invoke the interceptor chain
 * @param context Context object
 * @param interceptors An array of interceptors
 */
function invokeInterceptors(
  context: InvocationContext,
  interceptors: InterceptorOrKey[],
): ValueOrPromise<InvocationResult> {
  let index = 0;
  return next();

  /**
   * Invoke downstream interceptors or the target method
   */
  function next(): ValueOrPromise<InvocationResult> {
    // No more interceptors
    if (index === interceptors.length) {
      return invokeTargetMethod(context);
    }
    return invokeNextInterceptor();
  }

  /**
   * Invoke downstream interceptors
   */
  function invokeNextInterceptor(): ValueOrPromise<InvocationResult> {
    const interceptor = interceptors[index++];
    const interceptorFn = loadInterceptor(interceptor);
    return transformValueOrPromise(interceptorFn, fn => {
      /* istanbul ignore if */
      if (debug.enabled) {
        debug(
          'Invoking interceptor %d (%s) on %s',
          index - 1,
          fn.name,
          getTargetName(context.target, context.methodName),
          context.args,
        );
      }
      return fn(context, next);
    });
  }

  /**
   * Return the interceptor function or resolve the interceptor function as a
   * binding from the context
   * @param interceptor Interceptor function or binding key
   */
  function loadInterceptor(interceptor: InterceptorOrKey) {
    if (typeof interceptor === 'function') return interceptor;
    debug('Resolving interceptor binding %s', interceptor);
    return context.getValueOrPromise(interceptor) as ValueOrPromise<
      Interceptor
    >;
  }
}
