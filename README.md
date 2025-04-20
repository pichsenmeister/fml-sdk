# FML: Freeform Markup Language v0.1

## Overview
Freeform Markup Language (FML) is a lightweight, expressive markup language designed to write prompts for large language models (LLMs) using structured XML-style tags and Mustache-style variables. It’s designed for developers who want readable, reusable, and modular prompts without the chaos of raw strings.

## Features

- ✅ XML-style tags for roles: `<system>`, `<user>`, `<assistant>`
- 🧩 Mustache-style variable interpolation: `{{ name }}`
- 🔁 `<include>` tag for nesting other `.fml` files
- 🧪 Simple, testable, and transformable prompt formats
- ⚙️ Output ready for OpenAI-compatible APIs (ChatML-style)

## 📦 Installation

```bash
npm install fml-sdk
```

## Syntax

### Tags
FML uses angle-bracketed XML-style tags:

Tag | Purpose
`<system>` | Sets the assistant’s behavior or context
`<user>` | Simulates user input
`<assistant>` | Represents model responses
`<include src="..."/>` | Imports other `.fml` files
`<comment>` | Invisible to the model, used for internal docs


```xml
<system>
  You are a helpful assistant.
</system>

<user>
  Hello, what can you do?
</user>

<assistant>
  I can help with a variety of tasks including answering questions and writing code.
</assistant>
```

### Variables
Use `{{ variable_name }}` syntax for dynamic substitution:

```xml
<user>
  Tell me a story about {{ animal }} who learns to {{ skill }}.
</user>
```

### Attributes
Tags can have attributes for additional metadata:

```xml
How do I say "hello" in {{ language }}?
```

## Advanced Features

###  File Composition
Modularize prompts using `<include>`:

```xml
<include src="common/system-prompt.fml" />
<user>Hello there!</user>
```

### Conditional Logic (future support)

```xml
<if condition="{{ is_admin }}">
  <user>You have admin privileges.</user>
</if>
```

(Not implemented in v0.1, but reserved for future extensions.)

## Example

```xml
<!-- onboarding-prompt.fml -->
<system>
  You are an onboarding assistant helping users learn how to use the app.
</system>
<user>
  Hi, I'm {{ name }} and I just signed up.
</user>
<assistant>
  Welcome, {{ name }}! Let me walk you through the basics.
</assistant>
```

```ts
import { parseFML, toOpenAI } from 'fml-sdk'

const messages = await parseFML('onboarding-prompt.fml', {
  variables: { name: 'David' }
})

const formatted = toOpenAI(messages)
```

## File Format

- Extension: `.fml`
- UTF-8 encoding


Built with ❤️ by [David Pichsenmeister](https://pichsenmeister.com) to make prompting a bit more human.



