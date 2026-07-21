# Homebrew distribution for the Specboard CLI

`specboard.rb` here is the maintained source of the formula. The tap that users
install from lives in a separate repo, `Specboards/homebrew-tap`, as
`Formula/specboard.rb`.

## One-time setup

1. Create the public repo `Specboards/homebrew-tap`.
2. Add `Formula/specboard.rb` (copy of this directory's `specboard.rb`).

Users then install with:

```bash
brew install specboard/tap/specboard
```

(`specboard/tap` is shorthand for the `Specboards/homebrew-tap` repo.)

## On each CLI release

The npm publish happens first (push a `cli-v<version>` tag, which runs
`.github/workflows/cli-release.yml`). Then update the formula:

1. Bump `url` to the new version's npm tarball:
   `https://registry.npmjs.org/@specboard/cli/-/cli-<version>.tgz`
2. Set `sha256` to the tarball's checksum:

   ```bash
   tarball=$(npm view @specboard/cli@<version> dist.tarball)
   curl -sL "$tarball" | shasum -a 256
   ```

3. Copy the updated `specboard.rb` into the tap repo and push.

A future improvement is to automate steps 1-3 from the release workflow with a
bot commit to the tap; kept manual for now to avoid a cross-repo write token.
