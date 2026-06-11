export const INSTALL_AGENT_PROMPT = `Install Clawbrowser and clawctl by following the official Clawbrowser install documentation.

Primary docs:
- https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/INSTALL.md
- https://github.com/clawbrowser/clawbrowser

Instructions:
1. Read INSTALL.md first.
2. Follow the documented installation flow exactly.
3. Start from the standalone clawctl archive for the current OS/arch.
4. Do not download the browser archive manually as the bootstrap path.
5. Do not download the portable runtime manually unless INSTALL.md explicitly documents that as an offline/pre-extracted runtime path.
6. Do not use npm, npx, curl-piped installers, or a raw source checkout as the install path.
7. Run clawctl install so it can install or reuse Clawbrowser and install the portable runtime when needed.
8. Use the documented target/integration selection from INSTALL.md.
9. After installation, verify the browser using the verification steps documented in INSTALL.md.

API key:
- First check \${XDG_CONFIG_HOME:-$HOME/.config}/clawbrowser/config.json.
- If api_key already exists, do not ask again.
- If api_key is missing, ask once for the real API key from https://app.clawbrowser.ai.
- Save it using the documented clawctl config command.
- Never store the API key in shell rc files, environment variables, MCP config, agent config, project files, or logs.

Expected result:
- Standalone clawctl is installed and available.
- clawctl install has completed successfully.
- Clawbrowser is installed or reused.
- The portable Linux runtime is installed only when the host requires it.
- The selected agent integration is configured according to INSTALL.md.
- clawctl start works.
- Browser verification passes according to INSTALL.md.
`;
