// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {
  BindingAddress,
  BindingKey,
  ConfigurationResolver,
  Context,
  DefaultConfigurationResolver,
  ResolutionOptions,
  ValueOrPromise,
} from '../..';

describe('Context binding configuration', () => {
  /**
   * Create a subclass of context so that we can access parents and registry
   * for assertions
   */
  class TestContext extends Context {
    public configResolver: ConfigurationResolver;
  }

  let ctx: TestContext;
  beforeEach(createContext);

  describe('configure()', () => {
    it('configures options for a binding before it is bound', () => {
      const bindingForConfig = ctx.configure('foo').to({x: 1});
      expect(bindingForConfig.key).to.equal(
        BindingKey.buildKeyForConfig('foo'),
      );
      expect(bindingForConfig.tagMap).to.eql({config: 'foo'});
    });

    it('configures options for a binding after it is bound', () => {
      ctx.bind('foo').to('bar');
      const bindingForConfig = ctx.configure('foo').to({x: 1});
      expect(bindingForConfig.key).to.equal(
        BindingKey.buildKeyForConfig('foo'),
      );
      expect(bindingForConfig.tagMap).to.eql({config: 'foo'});
    });
  });

  describe('getConfig()', () => {
    it('gets config for a binding', async () => {
      ctx.configure('foo').toDynamicValue(() => Promise.resolve({x: 1}));
      expect(await ctx.getConfig('foo')).to.eql({x: 1});
    });

    it('gets local config for a binding', async () => {
      ctx
        .configure('foo')
        .toDynamicValue(() => Promise.resolve({a: {x: 0, y: 0}}));
      ctx.configure('foo.a').toDynamicValue(() => Promise.resolve({x: 1}));
      expect(await ctx.getConfig<number>('foo.a', 'x')).to.eql(1);
      expect(await ctx.getConfig<number>('foo.a', 'y')).to.be.undefined();
    });

    it('defaults optional to true for config resolution', async () => {
      // `servers.rest` does not exist yet
      let server1port = await ctx.getConfig<number>('servers.rest', 'port');
      expect(server1port).to.be.undefined();

      // Now add `servers.rest`
      ctx.configure('servers.rest').to({port: 3000});
      server1port = await ctx.getConfig<number>('servers.rest', 'port');
      expect(server1port).to.eql(3000);
    });

    it('throws error if a required config cannot be resolved', async () => {
      expect(
        ctx.getConfig('servers.rest', 'host', {
          optional: false,
        }),
      )
        .to.be.rejectedWith(
          `Configuration 'servers.rest#host' cannot be resolved`,
        )
        .catch(e => {
          // Sink the error to avoid UnhandledPromiseRejectionWarning
        });
    });
  });

  describe('getConfigSync()', () => {
    it('gets config for a binding', () => {
      ctx.configure('foo').to({x: 1});
      expect(ctx.getConfigSync('foo')).to.eql({x: 1});
    });

    it('throws a helpful error when the config is async', () => {
      ctx.configure('foo').toDynamicValue(() => Promise.resolve('bar'));
      expect(() => ctx.getConfigSync('foo')).to.throw(
        /Cannot get config\[\] for foo synchronously: the value is a promise/,
      );
    });
  });

  describe('configResolver', () => {
    class MyConfigResolver implements ConfigurationResolver {
      getConfigAsValueOrPromise<ConfigValueType>(
        key: BindingAddress<unknown>,
        configPath?: string,
        resolutionOptions?: ResolutionOptions,
      ): ValueOrPromise<ConfigValueType | undefined> {
        return ((key + '.config') as unknown) as ConfigValueType;
      }
    }
    it('gets default resolver', () => {
      ctx.getConfigSync('xyz');
      expect(ctx.configResolver).to.be.instanceOf(DefaultConfigurationResolver);
    });

    it('allows custom resolver', () => {
      ctx.configResolver = new MyConfigResolver();
      const config = ctx.getConfigSync('xyz');
      expect(config).to.equal('xyz.config');
    });

    it('allows custom resolver bound to the context', () => {
      ctx
        .bind(`${BindingKey.CONFIG_NAMESPACE}.resolver`)
        .toClass(MyConfigResolver);
      const config = ctx.getConfigSync('xyz');
      expect(config).to.equal('xyz.config');
      expect(ctx.configResolver).to.be.instanceOf(MyConfigResolver);
    });
  });

  function createContext() {
    ctx = new TestContext();
  }
});
