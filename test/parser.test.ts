import { parseFML } from '../src/parser'

describe('parseFML', () => {
  it('parses a simple FML file and interpolates variables', async () => {
    const message = await parseFML('./cases/simple.fml', {
      variables: { name: 'Alice' }
    })

    const expectedMessage = `Welcome, Alice! Let me walk you through the basics.
<instructions>
This is a tag with instructions.
</instructions>`
    expect(message).toEqual(expectedMessage)
  })

  it('parses a simple FML file without tags', async () => {
    const message = await parseFML('./cases/no-tags.fml')

    const expectedMessage = `This file has no tags at all.`
    expect(message).toEqual(expectedMessage)
  })

  it('parses an FML file with includes', async () => {
    const message = await parseFML('./cases/include.fml')

    const expectedMessage = `This file contains an include in different xml formats
This file has no tags at all.
This file has no tags at all.
This file has no tags at all.`
    expect(message).toEqual(expectedMessage)
  })

  it('parses an FML file with nested includes', async () => {
    const message = await parseFML('./cases/nested-include.fml')

    const expectedMessage = `This file contains a nested include
<tag>
This file contains an include in different xml formats
This file has no tags at all.
This file has no tags at all.
This file has no tags at all.
</tag>`
    expect(message).toEqual(expectedMessage)
  })

  it('parses an FML file with nested includes and variables', async () => {
    const message = await parseFML('./cases/nested-include-with-var.fml', {
      variables: { name: 'Alice' }
    })

    const expectedMessage = `This file contains a nested include with variables
<tag>
This file contains an include
Hello, Alice! Let me walk you through the basics.
</tag>`
    expect(message).toEqual(expectedMessage)
  })

  it('parses a simple FML file with the correct baseDir', async () => {
    const message = await parseFML('simple.fml', {
      baseDir: './test/cases',
      variables: { name: 'Alice' }
    })

    const expectedMessage = `Welcome, Alice! Let me walk you through the basics.
<instructions>
This is a tag with instructions.
</instructions>`
    expect(message).toEqual(expectedMessage)
  })
})