// fml-sdk/src/parser.ts
import fs from 'fs/promises';
import path from 'path'; // Import path module
import mustache from 'mustache';

interface FMLParseOptions {
  /**
   * An object containing key-value pairs for variable substitution.
   * For example, if your FML file has `{{ name }}`, you can pass `{ name: 'David' }`.
   */
  variables?: Record<string, any>;
  /**
   * The base directory against which to resolve the `filePath` if it's relative.
   * If not provided, relative `filePath` will be resolved against the current working directory.
   * This option does not affect the resolution of `<include>` paths, which are always
   * relative to their parent FML file.
   */
  baseDir?: string;
}

/**
 * Parses an FML (Freeform Markup Language) file by reading its content,
 * processing <include src="..."/> tags recursively, substituting variables
 * using Mustache syntax (e.g., {{variableName}}), and returns the
 * resulting content as a string.
 *
 * FML tags (other than `<include/>`) are preserved in the output string.
 * Paths for `<include>` tags are always resolved relative to their parent FML file.
 *
 * @param filePath The absolute or relative path to the .fml file.
 * @param options Optional parameters, including variables for substitution.
 * @param _currentlyProcessingPaths Internal set to track files being processed
 *                                  to detect circular dependencies. Should not be
 *                                  set by external callers.
 * @returns A promise that resolves to the parsed string content.
 * @throws Will throw an error if the file cannot be read, if Mustache rendering fails,
 *         or if a circular dependency is detected.
 */
export async function parseFML(
  relativePath: string,
  options?: FMLParseOptions,
  _currentlyProcessingPaths: Set<string> = new Set<string>()
): Promise<string> {
  const callerFile = _getCallerFile();
  if(!callerFile && !options?.baseDir) {
    throw new Error('Could not determine the caller file for resolving relative paths. Please provide a baseDir option or ensure the caller file is accessible.');
  }
  const callerDir = options?.baseDir || path.dirname(callerFile || '')
  const absoluteFilePath = path.resolve(callerDir, relativePath)

  if (_currentlyProcessingPaths.has(absoluteFilePath)) {
    const cyclePath = Array.from(_currentlyProcessingPaths).join(' -> ') + ' -> ' + absoluteFilePath;
    throw new Error(`Circular dependency detected: ${cyclePath}`);
  }
  _currentlyProcessingPaths.add(absoluteFilePath);

  let currentContent = await fs.readFile(absoluteFilePath, 'utf-8');

  // Process <include src="..."/> tags
  // Regex to find <include src="path/to/file.fml"/> (self-closing)
  // or <include src="path/to/file.fml">...</include> (with closing tag).
  const includeRegex = /<include\s+src="([^"]+?)"\s*(?:\s*\/>|>[\s\S]*?<\/include\s*>)/;
  let match;

  // Loop to find and replace include tags one by one.
  while ((match = includeRegex.exec(currentContent)) !== null) {
    const includeTag = match[0];
    const relativeSrcPath = match[1];

    const directoryOfCurrentFile = path.dirname(absoluteFilePath);
    const includedFilePath = path.resolve(directoryOfCurrentFile, relativeSrcPath);

    const includedContent = await parseFML(includedFilePath, options, new Set(_currentlyProcessingPaths));
    currentContent = currentContent.replace(includeTag, includedContent);
  }

  // After all includes are processed, substitute variables in the assembled content.
  let finalContent = currentContent;
  if (options?.variables && Object.keys(options.variables).length > 0) {
    finalContent = mustache.render(currentContent, options.variables, {}, { escape: (text) => text });
  }

  _currentlyProcessingPaths.delete(absoluteFilePath);

  return finalContent;
}

interface StackFrame {
  getFileName(): string | null;
  // Add other StackFrame methods if needed, e.g., getLineNumber, getFunctionName
}

function _getCallerFile(): string | undefined {
  const originalFunc = Error.prepareStackTrace;

  let callerfile: string | undefined;
  try {
    const err = new Error();
    let currentfile: string | null | undefined;

    Error.prepareStackTrace = (err: Error, stack: NodeJS.CallSite[] | StackFrame[]): StackFrame[] => stack as StackFrame[];

    const stack = err.stack as unknown as StackFrame[]; // Cast to StackFrame[] after prepareStackTrace

    currentfile = stack.shift()?.getFileName();

    while (stack.length) {
      const frame = stack.shift();
      if (frame) {
        callerfile = frame.getFileName() ?? undefined;
        if (currentfile !== callerfile) break;
      } else {
        break; 
      }
    }
  } catch (e) {}

  Error.prepareStackTrace = originalFunc;

  return callerfile;
}