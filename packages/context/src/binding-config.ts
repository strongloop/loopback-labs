// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {BindingAddress, BindingKey} from './binding-key';
import {Context} from './context';
import {ResolutionOptions} from './resolution-session';
import {ValueOrPromise} from './value-promise';

/**
 * Interface for configuration resolver
 */
export interface ConfigurationResolver {
  /**
   * Resolve the configuration value for a given binding key and config property
   * path
   * @param key Binding key
   * @param configPath Config property path
   * @param resolutionOptions Resolution options
   */
  getConfigAsValueOrPromise<ConfigValueType>(
    key: BindingAddress<unknown>,
    configPath?: string,
    resolutionOptions?: ResolutionOptions,
  ): ValueOrPromise<ConfigValueType | undefined>;
}

/**
 * Resolver for configurations of bindings
 */
export class DefaultConfigurationResolver implements ConfigurationResolver {
  constructor(public readonly context: Context) {}

  /**
   * Resolve config for the binding key
   *
   * @param key Binding key
   * @param configPath Property path for the option. For example, `x.y`
   * requests for `<config>.x.y`. If not set, the `config` object will be
   * returned.
   * @param resolutionOptions Options for the resolution.
   * - optional: if not set or set to `true`, `undefined` will be returned if
   * no corresponding value is found. Otherwise, an error will be thrown.
   */
  getConfigAsValueOrPromise<ConfigValueType>(
    key: BindingAddress<unknown>,
    configPath?: string,
    resolutionOptions?: ResolutionOptions,
  ): ValueOrPromise<ConfigValueType | undefined> {
    configPath = configPath || '';
    const configKey = configBindingKeyFor(key, configPath);

    const options: ResolutionOptions = Object.assign(
      {optional: true},
      resolutionOptions,
    );
    return this.context.getValueOrPromise<ConfigValueType>(configKey, options);
  }
}

export function configBindingKeyFor<ConfigValueType = unknown>(
  key: BindingAddress,
  configPath?: string,
) {
  return BindingKey.create<ConfigValueType>(
    BindingKey.buildKeyForConfig(key),
    configPath,
  );
}
