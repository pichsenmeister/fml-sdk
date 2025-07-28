import { parseFML } from '../src'

async function main() {
  const message = await parseFML('./onboarding-prompt.fml', {
    variables: { name: 'David' }
  })

  console.log(message)
}

main().catch(console.error)