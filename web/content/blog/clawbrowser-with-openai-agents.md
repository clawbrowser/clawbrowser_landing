---
title: "Using Clawbrowser as a Tool in OpenAI Agents SDK"
excerpt: "Give your OpenAI agent the ability to browse the web — with proper session management and structured output."
date: "2025-05-22"
author: "Clawbrowser Team"
tags: ["openai", "agents", "integration"]
---

The OpenAI Agents SDK lets you equip an LLM with tools. Clawbrowser is a natural fit — it gives your agent a browser with persistent sessions, bot evasion, and structured output.

Here's how to wire them together.

## What we're building

An agent that can:
- Navigate to any URL
- Extract structured data from pages
- Fill forms and click buttons
- Maintain session state across tool calls

## Setup

```bash
pip install openai clawbrowser-py
```

Or use the CLI directly via `subprocess` — Clawbrowser is language-agnostic.

## Defining the browser tools

```python
from openai import OpenAI
import subprocess
import json

client = OpenAI()

# Tool definitions
tools = [
    {
        "type": "function",
        "function": {
            "name": "navigate",
            "description": "Navigate to a URL in the browser. Returns page title and URL after navigation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to navigate to"
                    },
                    "profile": {
                        "type": "string",
                        "description": "Browser profile name for session persistence",
                        "default": "default"
                    }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "extract",
            "description": "Extract structured data from the current page or a given URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "what": {
                        "type": "string",
                        "description": "Description of what data to extract, in plain English"
                    },
                    "url": {
                        "type": "string",
                        "description": "URL to extract from (optional, uses current page if omitted)"
                    },
                    "profile": {
                        "type": "string",
                        "default": "default"
                    }
                },
                "required": ["what"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "click",
            "description": "Click an element on the current page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {
                        "type": "string",
                        "description": "Description of the element to click"
                    },
                    "profile": {"type": "string", "default": "default"}
                },
                "required": ["target"]
            }
        }
    }
]
```

## Tool execution

```python
def execute_tool(name: str, args: dict) -> str:
    profile = args.get("profile", "default")
    
    if name == "navigate":
        result = subprocess.run(
            ["claw", "navigate", args["url"], "--profile", profile, "--json"],
            capture_output=True, text=True
        )
    
    elif name == "extract":
        cmd = ["claw", "extract", args["what"], "--profile", profile, "--json"]
        if "url" in args:
            cmd += ["--url", args["url"]]
        result = subprocess.run(cmd, capture_output=True, text=True)
    
    elif name == "click":
        result = subprocess.run(
            ["claw", "click", args["target"], "--profile", profile, "--json"],
            capture_output=True, text=True
        )
    
    else:
        return json.dumps({"error": f"Unknown tool: {name}"})
    
    return result.stdout if result.returncode == 0 else result.stderr
```

## The agent loop

```python
def run_agent(task: str, profile: str = "default"):
    # Create profile if it doesn't exist
    subprocess.run(
        ["claw", "profile", "create", "--name", profile,
         "--os", "windows", "--browser", "chrome"],
        capture_output=True
    )
    
    messages = [
        {
            "role": "system",
            "content": (
                "You are a web research agent. Use the navigate, extract, and click tools "
                "to complete tasks. Always use structured extraction when you need data. "
                f"Use profile '{profile}' for all tool calls."
            )
        },
        {"role": "user", "content": task}
    ]
    
    while True:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        message = response.choices[0].message
        messages.append(message)
        
        # No tool calls — agent is done
        if not message.tool_calls:
            return message.content
        
        # Execute each tool call
        for tool_call in message.tool_calls:
            args = json.loads(tool_call.function.arguments)
            result = execute_tool(tool_call.function.name, args)
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })
```

## Running it

```python
# Research task
result = run_agent(
    "Go to news.ycombinator.com and give me the top 5 stories with their vote counts.",
    profile="hn-research"
)
print(result)

# Multi-step task with session persistence
result = run_agent(
    "Log into my account at app.example.com using the saved session, "
    "then extract my current subscription plan and billing date.",
    profile="my-account"  # pre-authenticated profile
)
print(result)
```

## Why this beats browser-use and similar libraries

| Feature | DIY browser-use | Clawbrowser + OpenAI |
|---------|----------------|---------------------|
| Session persistence | Manual | Profile system |
| Bot detection evasion | None | Built-in |
| Proxy management | Manual | Built-in |
| Structured output | LLM parsing | Native `--json` |
| Parallel agents | Complex setup | Profile isolation |

Your LLM focuses on reasoning. Clawbrowser handles the browser infrastructure.
