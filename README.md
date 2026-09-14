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
┌─ claude ─────────────────────┬─ ccx · my-project ──────────────┐
│ > _                          │  ◆ ccx  my-project   master ●3  │
│                              │                                 │
│                              │  ▾ Memory        4              │
│                              │      CLAUDE.md   project        │
│                              │      CLAUDE.md   workspace      │
│                              │  ▾ Skills       14   ▲2 broken  │
│                              │      e2e-test    project  ● own │
│                              │      harness-sync global  ↗ link│
│                              │  ▸ MCP           4   ●●○!       │
│                              │  ▸ Hooks         6              │
│                              │  ▸ Permissions  40 allow · 6 deny│
│                              │  ▸ Health       ▲ 3             │
└──────────────────────────────┴─────────────────────────────────┘
```

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
| **Permissions** | the merged allow / deny / ask rules and which file each came from |
| **Plugins** | enabled state, version, and what each one contributes |
| **Health** | broken symlinks, settings pointing at directories that no longer exist, unapproved MCP servers, and **plaintext credentials sitting in config files** |

## Install

```bash
git clone https://github.com/denimar/ccx.git
cd ccx
./install/install.sh        # build, link, kitty config, desktop entry, dock icon
```

Then restart kitty (remote control is a startup option) and run `ccx doctor`.

Uninstall with `./install/install.sh --uninstall`. Every change it makes to `kitty.conf` and
`.zshrc` is inside a marked `# >>> ccx >>>` block.

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
