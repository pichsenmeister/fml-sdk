import fs from 'fs/promises'
import path from 'path'
import { parseStringPromise, Builder } from 'xml2js'
import Mustache from 'mustache'

export type PromptMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ParseOptions = {
  variables?: Record<string, any>
}

function interpolate(content: string, variables: Record<string, any> = {}): string {
  return Mustache.render(content, variables)
}

async function resolveIncludesInNode(node: any, baseDir: string): Promise<any> {
  if (typeof node !== 'object') return node

  for (const key of Object.keys(node)) {
    const value = node[key]

    if (Array.isArray(value)) {
      node[key] = await Promise.all(value.map(async (item) => {
        if (item.include && item.include.$?.src) {
          const includePath = path.resolve(baseDir, item.include.$.src)
          const includeXml = await fs.readFile(includePath, 'utf-8')
          const parsedInclude = await parseStringPromise(`<root>${includeXml}</root>`, { trim: true, explicitArray: false })
          return await resolveIncludesInNode(parsedInclude.root, path.dirname(includePath))
        } else {
          return await resolveIncludesInNode(item, baseDir)
        }
      }))
    } else if (typeof value === 'object') {
      node[key] = await resolveIncludesInNode(value, baseDir)
    }
  }

  return node
}

export async function parseFML(filePath: string, options: ParseOptions = {}): Promise<PromptMessage[]> {
  const xml = await fs.readFile(filePath, 'utf-8')
  const parsed = await parseStringPromise(`<root>${xml}</root>`, { trim: true, explicitArray: false })
  const resolved = await resolveIncludesInNode(parsed.root, path.dirname(filePath))

  const supportedRoles: (keyof typeof resolved)[] = ['system', 'user', 'assistant']

  const result: PromptMessage[] = []

  for (const role of supportedRoles) {
    const blocks = resolved[role]
    if (!blocks) continue

    const contents = Array.isArray(blocks) ? blocks : [blocks]
    for (const content of contents) {
      if (typeof content === 'string') {
        result.push({
          role,
          content: interpolate(content, options.variables)
        })
      } else if (typeof content === 'object' && '_' in content) {
        result.push({
          role,
          content: interpolate(content._, options.variables)
        })
      }
    }
  }

  return result
}