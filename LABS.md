# LoopBack 4 Labs

We created `loopback-labs` monorepo to facilitate development of experimental
features without interfering with `loopback-next`.

`loopback-labs` is a logical `fork` of `loopback-next` as github does not allow
us to folk `loopback-next` into the same organization (`strongloop`).

We divide responsibilities of the two repositories as follows:

- `loopback-next`: the repository to develop and release production-ready
  features.

- `loopback-labs`: the repository to develop and release experimental features.

Two-way interactions can happen between `loopback-labs` and `loopback-next`.

1. Keep `loopback-labs` in sync with `loopback-next` for production-ready
   features by rebasing against `loopback-next@master`.

2. Graduate experimental features from `loopback-labs` into `loopback-next`.

![loopback-labs](./loopback-labs.png)

## Workflow

### Work on an experimental feature in `@loopback-labs`

1. Set up local git repository for `loopback-labs`

```sh
git clone git@github.com:strongloop/loopback-labs.git
cd loopback-labs
git remote add next git@github.com:strongloop/loopback-next.git
```

2. Work on an experimental feature

It follows the same process and flow as `loopback-next`:

- Create a feature branch
- Make changes in the feature branch
- Submit a PR against `loopback-labs@master`

Please make sure changes to production packages

3. Pull in changes from `loopback-next@master`

```sh
cd loopback-labs
git checkout master
git fetch --all
git rebase next/master
git push --force-with-lease
```

4. Rebase the experimental feature branch against master

```
cd loopback-labs
git checkout experimental/feature-1
git fetch --all
git rebase origin/master
git push --force-with-lease
```

### Graduate an experimental feature

1. Set up local git repository for `loopback-next`

```sh
cd loopback-next
git remote add labs git@github.com:strongloop/loopback-labs.git
```

2. Pull in the experimental feature from `loopback-labs` into `loopback-next`

```sh
cd loopback-next
git checkout -b experimental/feature-1
git fetch --all

// check-pick commits from `labs` into `experimental/feature-1` branch

// Move experimental modules from `experimental` to `packages`

// Create a PR
```

## Questions

- Do we merge experimental features into `loopback-labs@master` or keep each of
  them isolated in `loopback-labs@labs/<my-experimental-feature>` branch?

To keep an experimental feature fully isolated and make it easy to graduate into
`loopback-next`, we should consider the following branching strategy illustrated
by an experimental feature named `socketio`.

1. Create an integration branch for SocketIO:

```sh
git checkout -b labs/socketio
```

2. Create a development branch for SocketIO:

```sh
git checkout -b experimental/socketio
```

3. Start to commit code into `experimental/socketio`

4. Submit a PR against `labs/socketio`

5. Merge the PR from `experimental/socketio` into `labs/socketio`

6. Graduate `socketio` into `loopback-next`:

```sh
cd loopback-next
git checkout -b feature/sockeio
git fetch --all
git rebase labs/labs/socketio
git push
```
