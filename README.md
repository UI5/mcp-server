# UI5 MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server for UI5 application development.

[![OpenUI5 Community Slack (#tooling channel)](https://img.shields.io/badge/slack-join-44cc11.svg)](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.1%20adopted-ff69b4.svg)](https://github.com/UI5/mcp-server?tab=coc-ov-file#readme)
[![REUSE status](https://api.reuse.software/badge/github.com/UI5/mcp-server)](https://api.reuse.software/info/github.com/UI5/mcp-server)
[![npm Package Version](https://badge.fury.io/js/%40ui5%2Fmcp-server.svg)](https://www.npmjs.com/package/@ui5/mcp-server)
[![Coverage Status](https://coveralls.io/repos/github/UI5/mcp-server/badge.svg)](https://coveralls.io/github/UI5/mcp-server)

## Description

The UI5 [Model Context Protocol](https://modelcontextprotocol.io/) server offers tools to improve the developer experience when working with agentic AI tools.

## Key Features

- Helps with the creation of new UI5 projects when working with agentic AI tools
- Supports the developer to detect and fix UI5-specific errors in the code
- Provides additional UI5-specific information for agentic AI tools

> [!TIP]
> Make sure to also check out our [announcement blog post](https://community.sap.com/t5/technology-blog-posts-by-sap/give-your-ai-agent-some-tools-introducing-the-ui5-mcp-server/ba-p/14200825) in the SAP Community!

## Available Tools

- `create_integration_card`: Scaffolds a new UI Integration Card.
- `create_ui5_app`: Scaffolds a new UI5 application based on a set of templates.
- `get_api_reference`: Fetches and formats UI5 API documentation.
- `get_guidelines`: Provides access to UI5 development best practices.
- `get_integration_cards_guidelines`: Provides access to UI Integration Cards development best practices.
- `get_project_info`: Extracts metadata and configuration from a UI5 project.
- `get_typescript_conversion_guidelines`: Provides guidelines for converting UI5 applications and controls from JavaScript to TypeScript.
- `get_version_info`: Retrieves version information for the UI5 framework.
- `run_manifest_validation`: Validates the manifest against the UI5 Manifest schema.
- `run_ui5_linter`: Integrates with [`@ui5/linter`](https://github.com/UI5/linter) to analyze and report issues in the UI5 code.

## Requirements

- [Node.js](https://nodejs.org/) Version v20.17.0, v22.9.0 or higher
- [npm](https://www.npmjs.com/) Version v8.0.0 or higher
- An MCP client, such as VS Code (GitHub Copilot), Cline, Claude Code, Codex, or any other MCP-compatible client

## Setup

### Standard Configuration for Most Clients

This configuration works for most MCP clients:

```json
{
    "mcpServers": {
        "@ui5/mcp-server": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "-y",
                "@ui5/mcp-server"
            ]
        }
    }
}
```

<details>
  <summary><i>Special configuration for native Windows</i></summary>
On native Windows (not WSL), you might need to prefix npx with `cmd /c`:

```json
{
    "mcpServers": {
        "@ui5/mcp-server": {
            "type": "stdio",
            "command": "cmd",
            "args": [
                "/c",
                "npx -y @ui5/mcp-server"
            ]
        }
    }
}
```
</details>

### Specific MCP Clients

Besides the general configuration outlined above, some MCP clients offer shortcuts for installing MCP servers. Below are instructions for some popular clients, but you can also refer to your specific client's documentation for more details.

#### VS Code

**Preferred:** Install from the **[GitHub MCP server registry](https://github.com/mcp/UI5/mcp-server)**

_Alternatively you can use the VS Code CLI:_

```bash
# Using VS Code CLI
code --add-mcp '{"name":"@ui5/mcp-server","type": "stdio","command":"npx","args":["-y", "@ui5/mcp-server"]}'
```

#### Cline

1. Open the Cline panel in VSCode.
2. Click on the "MCP Servers" icon at the top, next to the "plus" symbol
3. Change to the "Configure" tab, then click "Configure MCP servers"
4. In the editor that opens, insert the above [Standard Configuration for Most Clients](#standard-configuration-for-most-clients)

See [docs.cline.bot/mcp/adding-and-configuring-servers](https://docs.cline.bot/mcp/adding-and-configuring-servers) for details.

#### Claude Code

```bash
claude mcp add --transport stdio --scope user ui5-mcp-server -- npx -y @ui5/mcp-server
```

#### Codex

```
codex mcp add --transport stdio ui5-mcp-server -- npx -y @ui5/mcp-server
```

## Adding Rules to your Project

The following rules **guide large language models (LLMs) in using the UI5 MCP server correctly**. Add these rules to your existing global or project-specific [`AGENTS.md`](https://agents.md/) file. The exact location may vary depending on the MCP client. For example, Claude Code uses a `CLAUDE.md` file instead of `AGENTS.md`.

```markdown
## Guidelines for UI5

Use the `get_guidelines` tool of the UI5 MCP server to retrieve the latest coding standards and best practices for UI5 development.
```

### Configuration

The UI5 MCP server can be configured using the following environment variables. It does not accept any command-line arguments.

**Configuration Options:**

* **`UI5_MCP_SERVER_ALLOWED_DOMAINS`**:
    * Default Value: `localhost, services.odata.org`
    * Description: A comma-separated list of domains that are allowed to be used in various tools, for example: `localhost, example.com, sub.example.com`. Set to an empty string to allow any domains.
    For wildcard subdomains, prefix the domain with a dot: `.example.com`. This will match `www.example.com` but not `example.com`.
* **`UI5_MCP_SERVER_RESPONSE_NO_STRUCTURED_CONTENT`**:
    * Description: Set to any value to disable structured content in the MCP server responses.
* **`UI5_MCP_SERVER_RESPONSE_NO_RESOURCES`**:
    * Description: Set to any value to disable [resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) in the MCP server responses. This is useful for [clients that do not support resources](https://modelcontextprotocol.io/clients), such as Cursor or the Gemini CLI.
* **`UI5_LOG_LVL`**:
    * Default Value: `info`
    * Description: Internal [log level](https://ui5.github.io/cli/stable/pages/Troubleshooting/#changing-the-log-level): `silent`, `error`, `warn`, `info`, `perf`, `verbose`, `silly`
* **`UI5_DATA_DIR`**:
    * Default Value: The `.ui5` directory in the user's home directory
    * Description: Directory where the MCP server stores its data, such as cached API references.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/UI5/mcp-server/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

You can also chat with us in the [`#tooling`](https://openui5.slack.com/archives/C0A7QFN6B) channel of the [OpenUI5 Community Slack](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/). For public Q&A, use the [`ui5-tooling` tag on Stack Overflow](https://stackoverflow.com/questions/tagged/ui5-tooling).

## Security / Disclosure

If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/UI5/mcp-server/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/UI5/mcp-server?tab=coc-ov-file#readme) at all times.

## Licensing

Copyright 2026 SAP SE or an SAP affiliate company and UI5 MCP server contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/UI5/mcp-server).
