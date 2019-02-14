// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/express-middleware
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {BindingKey} from '@loopback/context';
import {MiddlewareRegistry} from './middleware-registry';
import {MiddlewareRegistryOptions} from './types';

export namespace ExpressBindings {
  /**
   * Binding key for express middleware registry
   */
  export const EXPRESS_MIDDLEWARE_REGISTRY = BindingKey.create<
    MiddlewareRegistry
  >('express.middleware-registry');

  /**
   * Binding key for express middleware registry options
   */
  export const EXPRESS_MIDDLEWARE_REGISTRY_OPTIONS = BindingKey.create<
    MiddlewareRegistryOptions
  >('express.middleware-registry.options');
}
