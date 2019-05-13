## LoopBack 4 Labs

We created `loopback-labs` monorepo to facilitate development of experimental
features without interfering with `loopback-next`.

`loopback-labs` is a logical `fork` of `loopback-next` (github does not allow us
to folk `loopback-next` into the same organization (`strongloop`)).

We divide responsibilities as follows:

- `loopback-next`: the repository to develop and release production-ready
  features.

- `loopback-labs`: the repository to develop and release experimental features.

Two-way interactions can happen between `loopback-labs` and `loopback-next`.

1. Keep `loopback-labs` in sync with `loopback-next` for production-ready
   features by rebasing against `loopback-next@master`.

2. Graduate experimental features from `loopback-labs` into `loopback-next`.

## Set up local git repository for `loopback-labs`

```sh
git clone git@github.com:strongloop/loopback-labs.git
cd loopback-labs
git remote add next git@github.com:strongloop/loopback-next.git
```

## Work on an experimental feature

It follows the same process and flow as `loopback-next`:

1. Create a feature branch
2. Make changes in the feature branch
3. Submit a PR against `loopback-labs@master`

Please make sure changes to production packages

## Pull in changes from `loopback-next@master`

```sh
cd loopback-labs
git checkout master
git fetch --all
git rebase next/master
git push --force-with-lease
```

## Rebase the experimental feature branch against master

```
cd loopback-labs
git checkout experimental/feature-1
git fetch --all
git rebase origin/master
git push --force-with-lease
```

## Graduate an experimental feature

### Set up local git repository for `loopback-next`

```sh
cd loopback-next
git remote add labs git@github.com:strongloop/loopback-labs.git
```

### Pull in the experimental feature from `loopback-labs` into `loopback-next`

```sh
cd loopback-next
git checkout -b experimental/feature-1
git fetch --all

// check-pick commits from `labs` into `experimental/feature-1` branch

// Move experimental modules from `experimental` to `packages`

// Create a PR
```
