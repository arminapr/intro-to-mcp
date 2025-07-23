/**
 * Simple MCP Server Example
 * this is a basic structure to understand the concept of a Model Context Protocol server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// create the mcp server instance (automatically called through init)
const server = new Server(
    {
        name: "simple-demo-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// lists available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_weather",
                description: "Get current weather for a city",
                inputSchema: {
                    type: "object",
                    properties: {
                        city: {
                            type: "string",
                            description: "City name",
                        },
                    },
                    required: ["city"],
                },
            },
            {
                name: "calculate",
                description: "Perform basic mathematical calculations",
                inputSchema: {
                    type: "object",
                    properties: {
                        expression: {
                            type: "string",
                            description: "Mathematical expression (e.g., '2 + 3 * 4')",
                        },
                    },
                    required: ["expression"],
                },
            },
            {
                name: "generate_uuid",
                description: "Generate a random UUID",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args || typeof args.city !== "string") {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: an argument is required.`,
                },
            ],
            isError: true,
        };
    }

    switch (name) {
        case "get_weather":
            // Simulated weather data
            const city = args.city as string;
            const weatherData = {
                city: city,
                temperature: Math.floor(Math.random() * 40) + 10, // Random temp 10-50°C
                condition: ["Sunny", "Cloudy", "Rainy", "Snowy"][Math.floor(Math.random() * 4)],
                humidity: Math.floor(Math.random() * 100),
                timestamp: new Date().toISOString(),
            };

            return {
                content: [
                    {
                        type: "text",
                        text: `Weather in ${city}:
                            Temperature: ${weatherData.temperature}°C
                            Condition: ${weatherData.condition}
                            Humidity: ${weatherData.humidity}%
                            Updated: ${weatherData.timestamp}`,
                    },
                ],
            };

        case "calculate":
            const expression = args.expression as string;
            try {
                // in reality, we shouldnt do this bc claude has a built-in calculator that can do simple math lol
                const result = Function(`"use strict"; return (${expression})`)();
                return {
                    content: [
                        {
                            type: "text",
                            text: `${expression} = ${result}`,
                        },
                    ],
                };
            } catch (error) {
                const errorMessage = typeof error === "object" && error !== null && "message" in error
                    ? (error as { message: string }).message
                    : String(error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error calculating "${expression}": ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }

        case "generate_uuid":
            const uuid = crypto.randomUUID();
            return {
                content: [
                    {
                        type: "text",
                        text: `Generated UUID: ${uuid}`,
                    },
                ],
            };

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

// define available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "demo://system-info",
                name: "System Information",
                description: "Basic system information",
                mimeType: "application/json",
            },
            {
                uri: "demo://server-stats",
                name: "Server Statistics",
                description: "Current server statistics",
                mimeType: "text/plain",
            },
        ],
    };
});

// handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
        case "demo://system-info":
            const systemInfo = {
                platform: process.platform,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                serverName: "simple-demo-server",
                timestamp: new Date().toISOString(),
            };

            return {
                contents: [
                    {
                        uri,
                        mimeType: "application/json",
                        text: JSON.stringify(systemInfo, null, 2),
                    },
                ],
            };

        case "demo://server-stats":
            const stats = `MCP Server Statistics
                ======================
                Server Name: simple-demo-server
                Version: 1.0.0
                Uptime: ${Math.floor(process.uptime())} seconds
                Memory Usage: ${Math.floor(process.memoryUsage().heapUsed / 1024 / 1024)} MB
                Available Tools: 3 (get_weather, calculate, generate_uuid)
                Available Resources: 2 (system-info, server-stats)
                Last Updated: ${new Date().toISOString()}`;

            return {
                contents: [
                    {
                        uri,
                        mimeType: "text/plain",
                        text: stats,
                    },
                ],
            };

        default:
            throw new Error(`Unknown resource: ${uri}`);
    }
});

// start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

// handle process termination gracefully
process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
});

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});