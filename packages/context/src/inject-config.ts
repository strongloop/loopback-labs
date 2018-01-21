// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {BindingFilter} from './binding-filter';
import {BindingKey} from './binding-key';
import {Context} from './context';
import {ContextView} from './context-view';
import {
  inject,
  Injection,
  InjectionMetadata,
  inspectTargetType,
} from './inject';
import {ResolutionSession} from './resolution-session';
import {getDeepProperty, ValueOrPromise} from './value-promise';
/**
   * Inject a property from `config` of the current binding. If no corresponding
   * config value is present, `undefined` will be injected.
   *
   * @example
   * ```ts
   * class Store {
   *   constructor(
   *     @config('x') public optionX: number,
   *     @config('y') public optionY: string,
   *   ) { }
   * }
   *
   * ctx.configure('store1', { x: 1, y: 'a' });
   * ctx.configure('store2', { x: 2, y: 'b' });
   *
   * ctx.bind('store1').toClass(Store);
   * ctx.bind('store2').toClass(Store);
   *
   *  const store1 = ctx.getSync('store1');
   *  expect(store1.optionX).to.eql(1);
   *  expect(store1.optionY).to.eql('a');

   * const store2 = ctx.getSync('store2');
   * expect(store2.optionX).to.eql(2);
   * expect(store2.optionY).to.eql('b');
   * ```
   *
   * @param configPath Optional property path of the config. If is `''` or not
   * present, the `config` object will be returned.
   * @param metadata Optional metadata to help the injection
   */
export function config(configPath?: string, metadata?: InjectionMetadata) {
  configPath = configPath || '';
  metadata = Object.assign(
    {configPath, decorator: '@config', optional: true},
    metadata,
  );
  return inject('', metadata, resolveFromConfig);
}

export namespace config {
  export const getter = function injectConfigGetter(
    configPath?: string,
    metadata?: InjectionMetadata,
  ) {
    configPath = configPath || '';
    metadata = Object.assign(
      {configPath, decorator: '@config.getter', optional: true},
      metadata,
    );
    return inject('', metadata, resolveAsGetterFromConfig);
  };

  export const view = function injectConfigView(
    configPath?: string,
    metadata?: InjectionMetadata,
  ) {
    configPath = configPath || '';
    metadata = Object.assign(
      {configPath, decorator: '@config.view', optional: true},
      metadata,
    );
    return inject('', metadata, resolveAsViewFromConfig);
  };
}

function resolveFromConfig(
  ctx: Context,
  injection: Injection,
  session: ResolutionSession,
): ValueOrPromise<unknown> {
  if (!session.currentBinding) {
    // No binding is available
    return undefined;
  }

  const meta = injection.metadata || {};
  const binding = session.currentBinding;

  return ctx.getConfigAsValueOrPromise(binding.key, meta.configPath, {
    session,
    optional: meta.optional,
  });
}

function resolveAsGetterFromConfig(
  ctx: Context,
  injection: Injection,
  session: ResolutionSession,
) {
  if (!session.currentBinding) {
    // No binding is available
    return undefined;
  }
  const meta = injection.metadata || {};
  const bindingKey = session.currentBinding.key;
  // We need to clone the session for the getter as it will be resolved later
  const forkedSession = ResolutionSession.fork(session);
  return async function getter() {
    return ctx.getConfigAsValueOrPromise(bindingKey, meta.configPath, {
      session: forkedSession,
      optional: meta.optional,
    });
  };
}

function resolveAsViewFromConfig(
  ctx: Context,
  injection: Injection,
  session: ResolutionSession,
) {
  const targetType = inspectTargetType(injection);
  if (targetType && targetType !== ContextView) {
    const targetName = ResolutionSession.describeInjection(injection)!
      .targetName;
    throw new Error(
      `The type of ${targetName} (${targetType.name}) is not ContextView`,
    );
  }
  if (!session.currentBinding) {
    // No binding is available
    return undefined;
  }
  const bindingKey = session.currentBinding.key;
  const view = new ConfigView(
    ctx,
    binding =>
      binding.key === BindingKey.buildKeyForConfig(bindingKey).toString(),
  );
  view.open();
  return view;
}

class ConfigView extends ContextView {
  constructor(
    ctx: Context,
    filter: BindingFilter,
    private configPath?: string,
  ) {
    super(ctx, filter);
  }

  async values(session?: ResolutionSession) {
    const configValues = await super.values(session);
    return configValues.map(v =>
      this.configPath ? getDeepProperty(v, this.configPath) : v,
    );
  }
}
