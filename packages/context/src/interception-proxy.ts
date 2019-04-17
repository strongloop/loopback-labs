// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Context} from './context';
import {InvocationArgs, invokeMethodWithInterceptors} from './interceptor';

/**
 * The Promise type for `T`. If `T` extends `Promise`, the type is `T`,
 * otherwise the type is `Promise<T>`.
 */
export type PromiseType<T> = T extends Promise<unknown> ? T : Promise<T>;

/**
 * The async variant of a function to always return Promise<R>. If T is not a
 * function, the type is `T`.
 */
// tslint:disable-next-line:no-unused (possible tslint bug to treat `R` as unused)
export type AsyncType<T> = T extends (...args: InvocationArgs) => infer R
  ? (...args: InvocationArgs) => PromiseType<R>
  : T;

/**
 * The proxy type for `T`. The return type for any method of `T` with original
 * return type `R` becomes `Promise<R>` if `R` does not extend `Promise`.
 * Property types stay untouched. For example:
 *
 * ```ts
 * class MyController {
 *   name: string;
 *
 *   greet(name: string): string {
 *     return `Hello, ${name}`;
 *   }
 *
 *   async hello(name: string) {
 *     return `Hello, ${name}`;
 *   }
 * }
 * ```
 *
 * `AsyncProxy<MyController>` will be:
 * ```ts
 * {
 *   name: string; // the same as MyController
 *   greet(name: string): Promise<string>; // the return type becomes `Promise<string>`
 *   hello(name: string): Promise<string>; // the same as MyController
 * }
 * ```
 */
export type AsyncProxy<T> = {[P in keyof T]: AsyncType<T[P]>};

/**
 * A proxy handler that applies interceptors
 *
 * See https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 */
export class InterceptionHandler<T extends object> implements ProxyHandler<T> {
  constructor(private context = new Context()) {}

  get(target: T, propertyName: PropertyKey, receiver: unknown) {
    // tslint:disable-next-line:no-any
    const targetObj = target as any;
    if (typeof propertyName !== 'string') return targetObj[propertyName];
    const propertyOrMethod = targetObj[propertyName];
    if (typeof propertyOrMethod === 'function') {
      return (...args: InvocationArgs) => {
        return invokeMethodWithInterceptors(
          this.context,
          target,
          propertyName,
          args,
        );
      };
    } else {
      return propertyOrMethod;
    }
  }
}

/**
 * Create a proxy that applies interceptors for method invocations
 * @param target Target class or object
 * @param context Context object
 */
export function createProxyWithInterceptors<T extends object>(
  target: T,
  context?: Context,
): AsyncProxy<T> {
  return new Proxy(target, new InterceptionHandler(context)) as AsyncProxy<T>;
}
