// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/authorization
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {CoreBindings} from '@loopback/core';
import {Constructor, Provider, inject} from '@loopback/context';
import {getAuthorizeMetadata} from '../decorators/authorize';
import {AuthorizationMetadata} from '../types';

/**
 * @description Provides authorization metadata of a controller method
 * @example `context.bind('authorization.meta')
 *   .toProvider(AuthMetadataProvider)`
 */
export class AuthMetadataProvider
  implements Provider<AuthorizationMetadata | undefined> {
  constructor(
    @inject(CoreBindings.CONTROLLER_CLASS)
    private readonly controllerClass: Constructor<{}>,
    @inject(CoreBindings.CONTROLLER_METHOD_NAME)
    private readonly methodName: string,
  ) {}

  /**
   * @returns AuthorizationMetadata
   */
  value(): AuthorizationMetadata | undefined {
    return getAuthorizeMetadata(this.controllerClass, this.methodName);
  }
}
