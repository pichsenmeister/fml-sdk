import { parseFML } from '../src/parser'

describe('parseFML', () => {
  it('parses a simple FML file and interpolates variables', async () => {
    const messages = await parseFML('./cases/simple.fml', {
      variables: { name: 'Alice' }
    })

    const expectedMessages = `Welcome, Alice! Let me walk you through the basics.
<instructions>
some instructions
</instructions>`
    expect(messages).toEqual(expectedMessages)
  })

  it('parses a simple FML file without tags', async () => {
    const messages = await parseFML('./cases/no-tags.fml')

    const expectedMessages = `This file has no tags at all.`
    expect(messages).toEqual(expectedMessages)
  })

  it('parses an FML file with includes', async () => {
    const messages = await parseFML('./cases/include.fml')

    const expectedMessages = `This file contains an include
This file has no tags at all.
This file has no tags at all.
This file has no tags at all.`
    expect(messages).toEqual(expectedMessages)
  })

  it('parses an FML file with nested includes', async () => {
    const messages = await parseFML('./cases/nested-include.fml')

    const expectedMessages = `This file contains a nested include
<tag>
This file contains an include
This file has no tags at all.
This file has no tags at all.
This file has no tags at all.
</tag>`
    expect(messages).toEqual(expectedMessages)
  })

  it('parses an FML file with nested includes and variables', async () => {
    const messages = await parseFML('./cases/nested-include-with-var.fml', {
      variables: { name: 'Alice' }
    })

    const expectedMessages = `This file contains a nested include with variables
<tag>
This file contains an include
Welcome, Alice! Let me walk you through the basics.
<instructions>
some instructions
</instructions>
</tag>`
    expect(messages).toEqual(expectedMessages)
  })
})