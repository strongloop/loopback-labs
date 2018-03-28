// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/authorization
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  MetadataInspector,
  Constructor,
  MethodDecoratorFactory,
  MetadataMap,
  BindingAddress,
} from '@loopback/context';
import {AuthorizationBindings} from '../keys';
import {
  AuthorizationMetadata,
  Voter,
  EVERYONE,
  ANONYMOUS,
  AUTHENTICATED,
  UNAUTHENTICATED,
} from '../types';

export class AuthorizeMethodDecoratorFactory extends MethodDecoratorFactory<
  AuthorizationMetadata
> {
  protected mergeWithOwn(
    ownMetadata: MetadataMap<AuthorizationMetadata>,
    target: Object,
    methodName?: string,
    // tslint:disable-next-line:no-any
    methodDescriptor?: TypedPropertyDescriptor<any> | number,
  ) {
    ownMetadata = ownMetadata || {};
    const methodMeta = ownMetadata[methodName!];
    methodMeta.allowedRoles = this.merge(
      methodMeta.allowedRoles,
      this.spec.allowedRoles,
    );
    methodMeta.deniedRoles = this.merge(
      methodMeta.deniedRoles,
      this.spec.deniedRoles,
    );
    methodMeta.scopes = this.merge(methodMeta.scopes, this.spec.scopes);
    methodMeta.voters = this.merge(methodMeta.voters, this.spec.voters);

    return ownMetadata;
  }

  private merge<T>(src?: T[], target?: T[]): T[] {
    const list: T[] = [];
    const set = new Set<T>(src || []);
    if (target) {
      for (const i of target) {
        set.add(i);
      }
    }
    for (const i of set.values()) list.push(i);
    return list;
  }
}
/**
 * Mark a controller method as requiring authorized user.
 *
 * @param spec Authorization metadata
 */
export function authorize(spec: AuthorizationMetadata) {
  return AuthorizeMethodDecoratorFactory.createDecorator(
    AuthorizationBindings.METADATA,
    spec,
  );
}

export namespace authorize {
  /**
   * Shortcut to configure allowed roles
   * @param roles
   */
  export const allow = (...roles: string[]) => authorize({allowedRoles: roles});
  /**
   * Shortcut to configure denied roles
   * @param roles
   */
  export const deny = (...roles: string[]) => authorize({deniedRoles: roles});
  /**
   * Shortcut to specify access scopes
   * @param scopes
   */
  export const scope = (...scopes: string[]) => authorize({scopes});

  /**
   * Shortcut to configure voters
   * @param voters
   */
  export const vote = (...voters: (Voter | BindingAddress<Voter>)[]) =>
    authorize({voters});

  /**
   * Allows all
   */
  export const allowAll = () => allow(EVERYONE);

  /**
   * Allow all but the given roles
   * @param roles
   */
  export const allowAllExcept = (...roles: string[]) =>
    authorize({
      deniedRoles: roles,
      allowedRoles: [EVERYONE],
    });

  /**
   * Deny all
   */
  export const denyAll = () => deny(EVERYONE);

  /**
   * Deny all but the given roles
   * @param roles
   */
  export const denyAllExcept = (...roles: string[]) =>
    authorize({
      allowedRoles: roles,
      deniedRoles: [EVERYONE],
    });

  /**
   * Allow authenticated users
   */
  export const allowAuthenticated = () => allow(AUTHENTICATED);
  /**
   * Deny unauthenticated users
   */
  export const denyUnauthenticated = () => deny(UNAUTHENTICATED);
}

/**
 * Fetch authorization metadata stored by `@authorize` decorator.
 *
 * @param controllerClass Target controller
 * @param methodName Target method
 */
export function getAuthorizeMetadata(
  controllerClass: Constructor<{}>,
  methodName: string,
): AuthorizationMetadata | undefined {
  return MetadataInspector.getMethodMetadata<AuthorizationMetadata>(
    AuthorizationBindings.METADATA,
    controllerClass.prototype,
    methodName,
  );
}
