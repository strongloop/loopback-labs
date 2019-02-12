# Spike notes

In this spike pull request, I am showing how we can allow LB3 developers to
expose their legacy applications in an LB4 project and thus allow them to run
both old LB3 and new LB4 endpoints in the same process.

The solution has two major parts:

- `app.mountExpressRouter(basePath, router, spec)`
- `Lb3AppBooter`

## mountExpressRouter

```ts
mountExpressRouter(
  basePath: string,
  router: ExpressRequestHandler,
  spec?: RouterSpec,
): void;
```

This new API is building on top of StaticAssetsRoute and allows LB4 app
developers to add arbitrary set of Express routes and provide OpenAPI spec.

The new request-handling pipeline has the following steps now:

1. Request-preprocessing middleware like CORS, this is not customizable yet.
2. Native LoopBack 4 routes (controller methods or route handlers).
3. External Express routers (if the request was not handled yet).
4. Static assets (if the request was not handled yet).

See
[external-express-routes.ts](./packages/rest/src/router/external-express-routes.ts)
for most of the implementation details.

## Lb3AppBooter

This booter is responsible for setting up LoopBack 3 application, obtaining
OpenAPI spec describing app's REST API and mounting the app on LB4.

I am proposing to put this booter into a standalone npm package to allow us to
get usage statistics from npm download numbers.

See [booter-lb3app/README.md](./packages/booter-lb3app) for documentation on how
to use this new booter. The implementation can be found in
[lb3app.booter.ts](.//packages/booter-lb3app/src/lb3app.booter.ts),

## Example app

The last part is an example application exposing
[loopback-getting-started](https://github.com/strongloop/loopback-getting-started)
via LoopBack 4.

- [lb3app/README](./examples/lb3app/README.md) describes the steps needed to add
  LB3 app into an LB4 project
- [lb3app/legacy/](./examples/lb3app/legacy) contains the imported
  getting-started app
- [lb3app/src/application.js](./examples/lb3app/src/application.ts) contains the
  modified Application class.

## Next steps

I am proposing to create the following user stories to turn this PoC into a
production-ready implementation.

1. Implement `app.mountExpressRouter()`, including test coverage and
   documentation.

2. Describe request handling steps. Explain the order in which different
   middleware and route handlers are invoked in LB4, what extension points are
   provided. This content can go into a new section to [Advanced topics in
   Sequence](https://loopback.io/doc/en/lb4/Sequence.html#advanced-topics] or we
   can create an entirely new page.

3. Implement `@loopback/booter-lb3app`, including test coverage and
   documentation. The booter package should not have any runtime dependency on
   `@loopback/boot`, it should use `peerDependencies` to specify which core
   packages it works with and dev-dependencies for development & testing. List
   of packages to put in peer dependencies:

   - `@loopback/core`
   - `@loopback/boot`
   - `@loopback/rest`

4. Create an example app based on `loopback-getting-started`
   (`@loopback/example-lb3app`) to showcase LB3+LB4 integration. Add acceptance
   tests to verify few REST endpoints, also a test to verify that LB3 endpoints
   are included in the OpenAPI spec produced by the LB4 app.

5. Migration guide.

   - Start by reorganizing the
     [docs for LoopBack 3.x users](https://loopback.io/doc/en/lb4/LoopBack-3.x.html):
     keep the current page as a top-level overview.
   - Move most of the content into a new page with a name like "Understanding
     the differences".
   - Create a new page with a name like "Migrating from v3". Describe how to use
     `Lb3AppBooter`. Explain the differences (breaking changes) introduced by
     the migration. I believe the only difference is in the spec format: LB3
     produces Swagger (OpenApi v2), LB4 produces OpenApi v3.

6. Spike: dynamically updated LB3 API (routes + spec). In LB3, it's possible to
   change the shape of REST API at runtime by adding or removing shared methods
   or even entire models. The PoC version of LB3+LB4 does not support spec
   updates, we need to do a spike to find the best solution. (For example,
   `mountExpressRouter` can accept a spec getter instead of the spec object.) As
   for the actual request handling, the PoC version reloads route handlers in
   "full" mode but does not reload in "router" mode. As part of the stories
   created from the spike, we should fix "router" mode to reload the LB3 handler
   when needed.