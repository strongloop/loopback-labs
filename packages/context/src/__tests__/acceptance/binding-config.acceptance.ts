// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {config, configBindingKeyFor, Context, ContextView} from '../..';

interface RestServerConfig {
  host?: string;
  port?: number;
}

class RestServer {
  constructor(@config() public configObj: RestServerConfig) {}
}

describe('Context bindings - injecting configuration for bound artifacts', () => {
  it('binds configuration independent of binding', async () => {
    const ctx = new Context();

    // Bind configuration
    ctx.configure('servers.rest.server1').to({port: 3000});

    // Bind RestServer
    ctx.bind('servers.rest.server1').toClass(RestServer);

    // Resolve an instance of RestServer
    // Expect server1.config to be `{port: 3000}
    const server1 = await ctx.get<RestServer>('servers.rest.server1');

    expect(server1.configObj).to.eql({port: 3000});
  });

  it('configures an artifact with a dynamic source', async () => {
    const ctx = new Context();

    // Bind configuration
    ctx
      .configure('servers.rest.server1')
      .toDynamicValue(() => Promise.resolve({port: 3000}));

    // Bind RestServer
    ctx.bind('servers.rest.server1').toClass(RestServer);

    // Resolve an instance of RestServer
    // Expect server1.config to be `{port: 3000}
    const server1 = await ctx.get<RestServer>('servers.rest.server1');
    expect(server1.configObj).to.eql({port: 3000});
  });

  it('configures an artifact with alias', async () => {
    const ctx = new Context();

    // Configure rest server 1 to reference `rest` property of the application
    // configuration
    ctx
      .configure('servers.rest.server1')
      .toAlias(configBindingKeyFor('application', 'rest'));

    // Configure the application
    ctx.configure('application').to({rest: {port: 3000}});

    // Bind RestServer
    ctx.bind('servers.rest.server1').toClass(RestServer);

    // Resolve an instance of RestServer
    // Expect server1.config to be `{port: 3000}
    const server1 = await ctx.get<RestServer>('servers.rest.server1');
    expect(server1.configObj).to.eql({port: 3000});
  });

  it('injects a getter function to access config', async () => {
    interface LoggerConfig {
      level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    }

    class Logger {
      constructor(
        @config.getter()
        public configGetter: () => Promise<LoggerConfig | undefined>,
      ) {}
    }

    const ctx = new Context();

    // Bind logger configuration
    ctx.configure('loggers.Logger').to({level: 'INFO'});

    // Bind Logger
    ctx.bind('loggers.Logger').toClass(Logger);

    const logger = await ctx.get<Logger>('loggers.Logger');
    let configObj = await logger.configGetter();
    expect(configObj).to.eql({level: 'INFO'});

    // Update logger configuration
    ctx.configure('loggers.Logger').to({level: 'DEBUG'});

    configObj = await logger.configGetter();
    expect(configObj).to.eql({level: 'DEBUG'});
  });

  it('injects a view to access config', async () => {
    interface LoggerConfig {
      level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    }

    class Logger {
      constructor(
        @config.view()
        public configView: ContextView<LoggerConfig>,
      ) {}
    }

    const ctx = new Context();

    // Bind logger configuration
    ctx.configure('loggers.Logger').to({level: 'INFO'});

    // Bind Logger
    ctx.bind('loggers.Logger').toClass(Logger);

    const logger = await ctx.get<Logger>('loggers.Logger');
    let configObj = await logger.configView.singleValue();
    expect(configObj).to.eql({level: 'INFO'});

    // Update logger configuration
    ctx.configure('loggers.Logger').to({level: 'DEBUG'});

    configObj = await logger.configView.singleValue();
    expect(configObj).to.eql({level: 'DEBUG'});
  });

  it('rejects injection of config view if the target type is not ContextView', async () => {
    class Logger {
      constructor(
        @config.view()
        public configView: object,
      ) {}
    }

    const ctx = new Context();

    // Bind logger configuration
    ctx.configure('loggers.Logger').to({level: 'INFO'});

    // Bind Logger
    ctx.bind('loggers.Logger').toClass(Logger);

    await expect(ctx.get<Logger>('loggers.Logger')).to.be.rejectedWith(
      'The type of Logger.constructor[0] (Object) is not ContextView',
    );
  });
});
