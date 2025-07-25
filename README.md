# UI5 MCP

> A Model Context Protocol (MCP) server for UI5

[![OpenUI5 Community Slack (#tooling channel)](https://img.shields.io/badge/slack-join-44cc11.svg)](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.1%20adopted-ff69b4.svg)](https://github.com/UI5/mcp?tab=coc-ov-file#readme)
[![REUSE status](https://api.reuse.software/badge/github.com/UI5/mcp)](https://api.reuse.software/info/github.com/UI5/mcp)
[![npm Package Version](https://badge.fury.io/js/%40ui5%mcp.svg)](https://www.npmjs.com/package/@ui5/mcp)
[![Coverage Status](https://coveralls.io/repos/github/UI5/mcp/badge.svg)](https://coveralls.io/github/UI5/mcp)

## Description

The UI5 MCP server offers tools to improve the developer experience when working with Agentic AI.

## Features

To be filled.

## Requirements

- [Node.js](https://nodejs.org/) Version v22.15.0
- [npm](https://www.npmjs.com/) Version v8.0.0 or higher

## Installation

To install the MCP server, run the following command in your terminal:

```bash
git clone https://github.com/ui5/mcp.git
# alternatively download and extract the zip file: https://github.com/ui5/mcp/archive/refs/heads/main.zip

cd mcp
npm install && npm run build
npm link
```

## Configuration

After the above installation has been completed, configure the UI5 MCP server in your client.

### General Configuration for most clients

```json
{
    "mcpServers": {
        "ui5mcp": {
            "command": "ui5mcp",
            "args": []
        }
    }
}
```

### VSCode

Follow the MCP install [guide](https://code.visualstudio.com/docs/copilot/chat/mcp-servers#_add-an-mcp-server) using the above configuration.

Or use the VSCode CLI:

```bash
# Using VSCode CLI
code --add-mcp '{"name":"ui5mcp","command":"ui5mcp","args":[]}'
```

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/UI5/mcp/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

You can also chat with us in the [`#tooling`](https://openui5.slack.com/archives/C0A7QFN6B) channel of the [OpenUI5 Community Slack](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/). For public Q&A, use the [`ui5-tooling` tag on Stack Overflow](https://stackoverflow.com/questions/tagged/ui5-tooling).

## Security / Disclosure
If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/UI5/mcp/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/UI5/mcp?tab=coc-ov-file#readme) at all times.

## Licensing

Copyright 2025 SAP SE or an SAP affiliate company and contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/UI5/mcp).
