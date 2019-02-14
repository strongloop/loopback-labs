// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/express-middleware
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  Constructor,
  Context,
  ContextView,
  createBindingFromClass,
  inject,
  Provider,
} from '@loopback/context';
import * as express from 'express';
import {Router} from 'express-serve-static-core';
import {ExpressBindings} from './keys';
import {asMiddlewareBinding, middlewareFilter} from './middleware';
import {
  ExpressRequestMethod,
  MiddlewareErrorHandler,
  MiddlewareHandler,
  MiddlewareRegistryOptions,
  MiddlewareRequestHandler,
  MiddlewareSpec,
} from './types';
import debugFactory = require('debug');
const debug = debugFactory('loopback:rest:middleware');

/**
 * A phase of express middleware
 */
export type MiddlewarePhase = {
  /**
   * Middleware phase name
   */
  phase: string;
  /**
   * Bindings for middleware within the phase
   */
  bindings: Readonly<Binding<MiddlewareHandler>>[];
};

interface UpdateRouter {
  (router: Router): void;
}

/**
 * A context-based registry for express middleware
 */
export class MiddlewareRegistry {
  public static readonly ERROR_PHASE = '$error';
  public static readonly FINAL_PHASE = '$final';

  private _routerUpdates: UpdateRouter[] | undefined;
  private _middlewareNameKey = 1;
  private _router?: express.Router;

  public readonly requestHandler: express.RequestHandler;

  constructor(
    @inject.context() private context: Context,
    @inject.view(middlewareFilter)
    public readonly middlewareView: ContextView<MiddlewareHandler>,
    @inject(ExpressBindings.EXPRESS_MIDDLEWARE_REGISTRY_OPTIONS, {
      optional: true,
    })
    protected options: MiddlewareRegistryOptions = {
      parallel: false,
      phasesByOrder: [],
    },
  ) {
    this.requestHandler = async (req, res, next) => {
      if (!this._router) {
        this._router = express.Router();
        await this.mountMiddleware(this._router);
      }
      return this._router(req, res, next);
    };
    middlewareView.on('refresh', () => {
      this._router = undefined;
      this._routerUpdates = undefined;
    });
  }

  setPhasesByOrder(phases: string[]) {
    this.options.phasesByOrder = phases || [];
  }

  /**
   * Get middleware phases ordered by the phase
   */
  protected getMiddlewarePhasesByOrder(): MiddlewarePhase[] {
    const bindings = this.middlewareView.bindings;
    const phases = this.sortMiddlewareBindingsByPhase(bindings);
    if (debug.enabled) {
      debug(
        'Middleware phases: %j',
        phases.map(phase => ({
          phase: phase.phase,
          bindings: phase.bindings.map(b => b.key),
        })),
      );
    }
    return phases;
  }

  /**
   * Get the phase for a given middleware binding
   * @param binding Middleware binding
   */
  protected getMiddlewarePhase(
    binding: Readonly<Binding<MiddlewareHandler>>,
  ): string {
    const phase = binding.tagMap.phase || '';
    debug(
      'Binding %s is configured with middleware phase %s',
      binding.key,
      phase,
    );
    return phase;
  }

  /**
   * Sort the middleware bindings so that we can start/stop them
   * in the right order. By default, we can start other middleware before servers
   * and stop them in the reverse order
   * @param bindings Middleware bindings
   */
  protected sortMiddlewareBindingsByPhase(
    bindings: Readonly<Binding<MiddlewareHandler>>[],
  ) {
    // Phase bindings in a map
    const phaseMap: Map<
      string,
      Readonly<Binding<MiddlewareHandler>>[]
    > = new Map();
    for (const binding of bindings) {
      const phase = this.getMiddlewarePhase(binding);
      let bindingsInPhase = phaseMap.get(phase);
      if (bindingsInPhase == null) {
        bindingsInPhase = [];
        phaseMap.set(phase, bindingsInPhase);
      }
      bindingsInPhase.push(binding);
    }
    // Create an array for phase entries
    const phases: MiddlewarePhase[] = [];
    for (const [phase, bindingsInPhase] of phaseMap) {
      phases.push({phase: phase, bindings: bindingsInPhase});
    }

    const phasesByOrder = this.getPhasesByOrder();

    // Sort the phases
    return phases.sort((p1, p2) => {
      const i1 = phasesByOrder.indexOf(p1.phase);
      const i2 = phasesByOrder.indexOf(p2.phase);
      if (i1 !== -1 || i2 !== -1) {
        // Honor the phase order
        return i1 - i2;
      } else {
        // Neither phase is in the pre-defined order
        // Use alphabetical order instead so that `1-phase` is invoked before
        // `2-phase`
        return p1.phase < p2.phase ? -1 : p1.phase > p2.phase ? 1 : 0;
      }
    });
  }

  /**
   * Build a list of phase names for the order. Two special phases are added
   * to the end of the list
   */
  private getPhasesByOrder() {
    const phasesByOrder = this.options.phasesByOrder.filter(
      p =>
        p !== MiddlewareRegistry.ERROR_PHASE &&
        p !== MiddlewareRegistry.FINAL_PHASE,
    );
    phasesByOrder.push(
      MiddlewareRegistry.ERROR_PHASE,
      MiddlewareRegistry.FINAL_PHASE,
    );
    return phasesByOrder;
  }

  /**
   * Mount middleware to the express router
   *
   * @param expressRouter An express router. If not provided, a new one
   * will be created.
   */
  async mountMiddleware(expressRouter = express.Router()): Promise<Router> {
    const tasks: UpdateRouter[] = await this.buildRouterUpdatesIfNeeded();
    for (const updateFn of tasks) {
      updateFn(expressRouter);
    }
    return expressRouter;
  }

  /**
   * Create an array of functions that add middleware to an express router
   */
  private async buildRouterUpdatesIfNeeded() {
    if (this._routerUpdates) return this._routerUpdates;
    const middleware = await this.middlewareView.values();
    const phases = this.getMiddlewarePhasesByOrder();
    const bindings = this.middlewareView.bindings;

    this._routerUpdates = [];
    for (const phase of phases) {
      const bindingsInPhase = phase.bindings;
      for (const binding of bindingsInPhase) {
        const index = bindings.indexOf(binding);
        const handler = middleware[index];
        const path = binding.tagMap.path;
        if (path) {
          // Add the middleware to the given path
          debug(
            'Adding middleware (binding: %s): %j',
            binding.key,
            binding.tagMap,
          );
          if (binding.tagMap.method) {
            // For regular express routes, such as `all`, `get`, or `post`
            // It corresponds to `app.get('/hello', ...);`
            const method = binding.tagMap.method as ExpressRequestMethod;
            this._routerUpdates.push(router => router[method](path, handler));
          } else {
            // For middleware, such as `app.use('/api', ...);`
            // The handler function can be an error handler too
            this._routerUpdates.push(router => router.use(path, handler));
          }
        } else {
          // Add the middleware without a path
          if (debug.enabled) {
            debug(
              'Adding middleware (binding: %s): %j',
              binding.key,
              binding.tagMap || {},
            );
          }
          this._routerUpdates.push(router => router.use(handler));
        }
      }
    }
    return this._routerUpdates;
  }

  setMiddlewareRegistryOptions(options: MiddlewareRegistryOptions) {
    this.context
      .bind(ExpressBindings.EXPRESS_MIDDLEWARE_REGISTRY_OPTIONS)
      .to(options);
    this._router = undefined;
    this._routerUpdates = undefined;
  }

  /**
   * Register a middleware handler function
   * @param handler
   * @param spec
   */
  middleware(handler: MiddlewareRequestHandler, spec: MiddlewareSpec = {}) {
    this.validateSpec(spec);
    const name = spec.name || `_${this._middlewareNameKey++}`;
    this.context
      .bind(`middleware.${name}`)
      .to(handler)
      .apply(asMiddlewareBinding(spec));
  }

  private validateSpec(spec: MiddlewareSpec = {}) {
    if (spec.method && !spec.path) {
      throw new Error(`Route spec for ${spec.method} must have a path.`);
    }
  }

  /**
   * Register an middleware error handler function
   * @param errHandler Error handler
   * @param spec
   */
  errorMiddleware(
    errHandler: MiddlewareErrorHandler,
    spec: MiddlewareSpec = {},
  ) {
    spec = Object.assign(spec, {phase: MiddlewareRegistry.ERROR_PHASE});
    const name = spec.name || `_${this._middlewareNameKey++}`;
    this.context
      .bind(`middleware.${name}`)
      .to(errHandler)
      .apply(asMiddlewareBinding(spec));
  }

  /**
   * Register a middleware provider class
   * @param providerClass
   * @param spec
   */
  middlewareProvider(
    providerClass: Constructor<Provider<MiddlewareRequestHandler>>,
    spec: MiddlewareSpec = {},
  ) {
    const binding = createBindingFromClass(providerClass, {
      namespace: 'middleware',
      name: spec.name,
    }).apply(asMiddlewareBinding(spec));
    this.validateSpec(binding.tagMap);
    this.context.add(binding);
  }
}
