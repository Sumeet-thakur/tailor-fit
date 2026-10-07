import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
    ListToolsRequestSchema, 
    CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";

/**
 * hostinger-mcp-filter.js
 * 
 * A wrapper for the Hostinger API MCP server that filters the tool list 
 * to stay under the 100-tool limit of some IDEs.
 */

// 1. Define which tool prefixes to KEEP (to stay under 100)
const ALLOWED_PREFIXES = [
    'hosting_', 
    'VPS_', 
    'domains_', 
    'billing_'
];

const start = async () => {
    // 2. Define the transport parameters using the SDK constructor
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "hostinger-api-mcp@latest", "--stdio"],
        env: { ...process.env, API_TOKEN: process.env.API_TOKEN }
    });
    
    const client = new Client({ 
        name: "hostinger-filter-proxy", 
        version: "1.0.0" 
    }, { capabilities: {} });
    await client.connect(transport);

    // 3. Create our proxy server
    const server = new Server({
        name: "hostinger-mcp-filtered",
        version: "1.0.0"
    }, {
        capabilities: { tools: {} }
    });

    // 4. Handle tool listing with FILTERING
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const result = await client.listTools();
        const filteredTools = result.tools.filter(tool => 
            ALLOWED_PREFIXES.some(prefix => tool.name.startsWith(prefix))
        );
        
        // Log for debugging (stderr is safest)
        console.error(`[Filter] Exposing ${filteredTools.length} tools (Filtered from ${result.tools.length})`);
        
        return { tools: filteredTools };
    });

    // 5. Proxy tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        return await client.callTool(request.params);
    });

    // 6. Connect the proxy to the IDE
    const serverTransport = new StdioServerTransport();
    await server.connect(serverTransport);
};

start().catch(err => {
    console.error("Fatal Error in Hostinger Proxy:", err);
    process.exit(1);
});
