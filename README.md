<h1 align="center">ccx</h1>
<p align="center"><em>Claude Code on the left. Everything Claude Code is actually loading, live, on the right.</em></p>

---

Claude Code reads configuration from a surprising number of places: `~/.claude/settings.json`,
`~/.claude.json`, a `.claude/` directory in every ancestor of your project, `.mcp.json` files,
plugin caches, and a `CLAUDE.md` chain that can be several levels deep. Working out what is
*actually active in this directory* usually means opening an editor and going file hunting.

`ccx` puts the answer next to your session:

```
$ cd ~/work/my-project
$ ccx
┌─ claude ─────────────────────┬─ ccx · my-project ────────────────┐
│ > _                          │ ◆ ccx  my-project      master ●3  │
│                              │ work › my-project                 │
│                              │                                   │
│                              │ ▾ Memory                        4 │
│                              │     CLAUDE.md             6L 291b │
│                              │     AGENTS.md                link │
│                              │                                   │
│                              │ ▾ Skills                  14 · ▲2 │
│                              │   ❯ e2e-test                  own │
│                              │     harness-sync             link │
│                              │     dangling               broken │
│                              │                                   │
│                              │ ▾ MCP                           4 │
│                              │     playwright              ready │
│                              │     vanta                    auth │
│                              │                                   │
│                              │ ▸ Health                   3 · ✘1 │
│                              │ ───────────────────────────────── │
│                              │ ✘ 1 error  ▲ 2   press !          │
│                              │ broken link → ~/.claude/skills/…  │
└──────────────────────────────┴───────────────────────────────────┘
```

Names are coloured by where they come from — this directory, the workspace above it, the harness
root, `~/.claude`, a plugin — and the right-hand column says the one thing that matters about each
row in a word: `own`, `link`, `broken`, `ready`, `failed`, `auth`, `off`. `?` shows the legend.

The panel watches every file it read. When Claude edits `.mcp.json` or drops a new skill in the
left pane, the right pane updates itself.

## What it surfaces

| Section | What you get |
|---|---|
| **Memory** | the whole `CLAUDE.md` / `AGENTS.md` chain up to `$HOME`, with `@imports` resolved, symlinks marked, and the auto-memory directory |
| **Skills** | every resolvable skill, its scope, whether it is a real directory or a symlink (and how many hops), which copy wins a name collision, and which links are broken |
| **MCP** | servers merged from all five places they can be declared, transport inferred when `type` is missing, gating flags honoured, plus live `✔ / ✘ / !` health |
| **Agents / Commands** | subagents and slash commands from project, ancestors and plugins — `.md` and `.toml` alike |
| **Hooks** | what will actually fire, including hooks inlined in a plugin manifest, grouped by event with their matchers |
| **Plugins** | enabled state, version, and what each one contributes |
| **Health** | broken symlinks, settings pointing at directories that no longer exist, unapproved MCP servers, and **plaintext credentials sitting in config files** |

## Install

Needs **node ≥ 20** on your PATH. Everything else is optional: kitty (for the split and the dock
icon), tmux (fallback split), the `claude` CLI (to actually run Claude Code), GNOME (to pin the
icon). pnpm is used when present, npm otherwise.

```bash
git clone https://github.com/denimar/ccx.git
cd ccx
./install/install.sh
```

That builds it and then:

| step | what it does | how to undo |
|---|---|---|
| `~/.local/bin/ccx` | a `/bin/sh` shim with absolute paths (so GUI launches work) | removed by `--uninstall` |
| `~/.config/kitty/kitty.conf` | appends a `# >>> ccx >>>` block enabling remote control + the `splits` layout | block deleted by `--uninstall` |
| `~/.local/share/icons/…` + `~/.local/share/applications/ccx.desktop` | the launcher; skipped entirely if kitty is not installed | removed by `--uninstall` |
| GNOME dock | pins `ccx.desktop` to the favorites | unpinned by `--uninstall` |
| `~/.zshrc` | appends a `# >>> ccx >>>` block sourcing the `chpwd` hint hook | block deleted by `--uninstall` |

Then:

1. **Quit and reopen kitty completely** — `allow_remote_control` is a startup option, so existing
   windows will not pick it up.
2. `ccx doctor` — every row should be ✔ (a ▲ is an optional thing you do not have).
3. `cd` into a project and run `ccx`, or click the dock icon.

**Re-run `install/install.sh` after `git pull`**, and also after switching node versions: the shim
hardcodes the absolute node path so that a desktop launch — which never sources your shell rc —
can find it.

Uninstall with `./install/install.sh --uninstall`.

## Usage

```bash
ccx                     # split: Claude Code left, HUD right (extra args go to claude)
ccx panel               # just the HUD
ccx scan [DIR]          # print the report once
ccx scan --json         # machine-readable, for scripts and CI
ccx pick                # fuzzy project picker, then split (this is what the dock icon opens)
ccx doctor              # verify the install
```

**Keys:** `↑↓` move · `→` expand · `←` collapse · `1-9` jump to section · `a`/`z` expand/collapse all ·
`o` open in `$EDITOR` · `/` filter · `r` rescan · `?` help · `q` quit

## Split engines

`ccx` picks one automatically:

1. **kitty** — used whenever you are inside kitty with remote control enabled. Preferred on
   purpose: unlike tmux it does not break the kitty graphics protocol, so images still render
   inside the Claude pane.
2. **tmux** — for any other terminal, or over ssh.
3. **plain** — no splitter available: prints the report once, then hands the terminal to Claude Code.

Force one with `--engine kitty|tmux|plain`.

## About your secrets

`ccx` reads configuration files that frequently contain credentials. It never prints them.
Values of `env` blocks are replaced by their key names, credential-shaped strings in `args`,
`url` and settings values are masked, and `*.env` files and `~/.claude/.credentials.json` are
never opened at all. A config file that *does* carry a plaintext credential is reported under
**Health**, by name and location only — which is usually the first time anyone notices.

## License

MIT
