# ccx — print a one-line nudge when you cd into a project that has Claude Code
# infrastructure. It never launches anything; type `ccx` to open the split.
_ccx_chpwd() {
  [[ -n "$CCX_ACTIVE" ]] && return
  command -v ccx >/dev/null 2>&1 && ccx hint
}
autoload -Uz add-zsh-hook 2>/dev/null && add-zsh-hook chpwd _ccx_chpwd
