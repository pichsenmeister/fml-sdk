import { parseFML } from '../src/parser'
import path from 'path'

describe('parseFML', () => {
  it('parses an FML file and interpolates variables including nested includes', async () => {
    const filePath = path.resolve(__dirname, '../examples/onboarding-prompt.fml')
    const messages = await parseFML(filePath, {
      variables: { name: 'Alice' }
    })

    expect(messages).toEqual([
      {
        role: 'system',
        content: 'You are an onboarding assistant. Help new users get started.'
      },
      {
        role: 'user',
        content: "Hi, I'm Alice and I just signed up."
      },
      {
        role: 'assistant',
        content: 'Welcome, Alice! Let me walk you through the basics.'
      }
    ])
  })
})