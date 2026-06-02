#!/usr/bin/env python3
"""MCP server for controlling Xiaomi Mi Bedside Lamp 2 via miio protocol."""

import asyncio
import json
import sys
from typing import Any

try:
    from miio import YeelightBedLamp
    from miio.exceptions import DeviceException
except ImportError:
    print("ERROR: python-miio not installed. Run: pip install python-miio", file=sys.stderr)
    sys.exit(1)

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp import types
except ImportError:
    print("ERROR: mcp not installed. Run: pip install mcp", file=sys.stderr)
    sys.exit(1)

import os

LAMP_IP    = os.environ.get("MI_LAMP_IP", "")
LAMP_TOKEN = os.environ.get("MI_LAMP_TOKEN", "")

server = Server("mi-bedside-lamp")


def get_lamp() -> YeelightBedLamp:
    if not LAMP_IP or not LAMP_TOKEN:
        raise ValueError(
            "MI_LAMP_IP and MI_LAMP_TOKEN env vars are required. "
            "Find your token with: miiocli device --ip <IP> --token <TOKEN> info"
        )
    return YeelightBedLamp(LAMP_IP, LAMP_TOKEN)


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="lamp_status",
            description="Get current status of Mi Bedside Lamp 2 (power, brightness, color temperature, color mode)",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        types.Tool(
            name="lamp_power",
            description="Turn Mi Bedside Lamp 2 on or off",
            inputSchema={
                "type": "object",
                "properties": {
                    "on": {
                        "type": "boolean",
                        "description": "true to turn on, false to turn off",
                    }
                },
                "required": ["on"],
            },
        ),
        types.Tool(
            name="lamp_brightness",
            description="Set brightness of Mi Bedside Lamp 2 (1–100)",
            inputSchema={
                "type": "object",
                "properties": {
                    "brightness": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 100,
                        "description": "Brightness level from 1 to 100",
                    }
                },
                "required": ["brightness"],
            },
        ),
        types.Tool(
            name="lamp_color_temp",
            description="Set color temperature of Mi Bedside Lamp 2 in Kelvin (1700–6500). Lower = warmer/yellower, higher = cooler/bluer.",
            inputSchema={
                "type": "object",
                "properties": {
                    "color_temp": {
                        "type": "integer",
                        "minimum": 1700,
                        "maximum": 6500,
                        "description": "Color temperature in Kelvin",
                    }
                },
                "required": ["color_temp"],
            },
        ),
        types.Tool(
            name="lamp_color",
            description="Set RGB color of Mi Bedside Lamp 2",
            inputSchema={
                "type": "object",
                "properties": {
                    "r": {"type": "integer", "minimum": 0, "maximum": 255, "description": "Red"},
                    "g": {"type": "integer", "minimum": 0, "maximum": 255, "description": "Green"},
                    "b": {"type": "integer", "minimum": 0, "maximum": 255, "description": "Blue"},
                },
                "required": ["r", "g", "b"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[types.TextContent]:
    try:
        lamp = get_lamp()

        if name == "lamp_status":
            status = lamp.status()
            result = {
                "power": "on" if status.is_on else "off",
                "brightness": status.brightness,
                "color_temp_kelvin": status.color_temp,
                "mode": str(status.mode),
            }
            if hasattr(status, "rgb") and status.rgb:
                result["rgb"] = {"r": status.rgb[0], "g": status.rgb[1], "b": status.rgb[2]}
            return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

        elif name == "lamp_power":
            if arguments["on"]:
                lamp.on()
                return [types.TextContent(type="text", text="Lamp turned ON")]
            else:
                lamp.off()
                return [types.TextContent(type="text", text="Lamp turned OFF")]

        elif name == "lamp_brightness":
            bri = arguments["brightness"]
            lamp.set_brightness(bri)
            return [types.TextContent(type="text", text=f"Brightness set to {bri}%")]

        elif name == "lamp_color_temp":
            ct = arguments["color_temp"]
            lamp.set_color_temp(ct)
            return [types.TextContent(type="text", text=f"Color temperature set to {ct}K")]

        elif name == "lamp_color":
            r, g, b = arguments["r"], arguments["g"], arguments["b"]
            lamp.set_rgb(r, g, b)
            return [types.TextContent(type="text", text=f"Color set to RGB({r}, {g}, {b})")]

        else:
            return [types.TextContent(type="text", text=f"Unknown tool: {name}")]

    except ValueError as e:
        return [types.TextContent(type="text", text=f"Configuration error: {e}")]
    except DeviceException as e:
        return [types.TextContent(type="text", text=f"Device error: {e}")]
    except Exception as e:
        return [types.TextContent(type="text", text=f"Error: {e}")]


async def main():
    async with stdio_server() as streams:
        await server.run(streams[0], streams[1], server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
