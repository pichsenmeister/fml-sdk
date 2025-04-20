import { parseFML, toOpenAI } from '../src'
import path from 'path'

async function main() {
  const messages = await parseFML(__dirname + '/onboarding-prompt.fml', {
    variables: { name: 'David' }
  })

  const openAIFormat = toOpenAI(messages)
  console.log(JSON.stringify(openAIFormat, null, 2))
}

main().catch(console.error)