// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/express-middleware
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  bind,
  Binding,
  BindingScope,
  BindingTemplate,
  BindingFilter,
  filterByTag,
} from '@loopback/context';
import {MiddlewareHandler, MiddlewareSpec} from './types';

/**
 * Configure the binding as express middleware
 * @param binding Binding
 */
export function asMiddlewareBinding(
  spec?: MiddlewareSpec,
): BindingTemplate<MiddlewareHandler> {
  const tags = Object.assign({}, spec);
  return (binding: Binding<MiddlewareHandler>) => {
    return binding
      .tag('middleware')
      .inScope(BindingScope.SINGLETON)
      .tag(tags);
  };
}

/**
 * A sugar `@middleware` decorator to simplify `@bind` for middleware classes
 * @param spec Middleware spec
 */
export function middleware(spec?: MiddlewareSpec) {
  return bind({tags: spec}, asMiddlewareBinding(spec));
}

/**
 * A filter function to find all middleware bindings
 */
export const middlewareFilter: BindingFilter<MiddlewareHandler> = filterByTag(
  'middleware',
);
