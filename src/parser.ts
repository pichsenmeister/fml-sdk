import fs from 'fs/promises';
import path from 'path';
import mustache from 'mustache';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

interface FMLParseOptions {
	/**
	 * The base directory against which to resolve the `relativePath` if it's relative.
	 * If not provided, relative `relativePath` will be resolved against the directory
	 * of the script calling `parseFML`.
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
 * @param relativePath The absolute or relative path to the .fml file.
 * @param variables An optional object containing key-value pairs for variable substitution.
 * @param options Optional parameters, including `baseDir` for path resolution
 * @param _currentlyProcessingPaths Internal set to track files being processed
 *                                  to detect circular dependencies. Should not be
 *                                  set by external callers.
 * @returns A promise that resolves to the parsed string content.
 * @throws Will throw an error if the file cannot be read, if Mustache rendering fails,
 *         or if a circular dependency is detected.
 */
export async function parseFML(
	relativePath: string,
	variables?: Record<string, any>,
	options?: FMLParseOptions,
	_currentlyProcessingPaths: Set<string> = new Set<string>()
): Promise<string> {
	let callerFile = _getCallerFile();
	if (callerFile?.startsWith('file:')) {
		callerFile = fileURLToPath(callerFile);
	}

	if (!callerFile && !options?.baseDir) {
		throw new Error(
			'Could not determine the caller file for resolving relative paths. Please provide a baseDir option or ensure the caller file is accessible.'
		);
	}
	const callerDir = options?.baseDir || path.dirname(callerFile || '');
	const absoluteFilePath = path.resolve(callerDir, relativePath);

	if (_currentlyProcessingPaths.has(absoluteFilePath)) {
		const cyclePath =
			Array.from(_currentlyProcessingPaths).join(' -> ') +
			' -> ' +
			absoluteFilePath;
		throw new Error(`Circular dependency detected: ${cyclePath}`);
	}
	_currentlyProcessingPaths.add(absoluteFilePath);

	let currentContent = await fs.readFile(absoluteFilePath, 'utf-8');

	// Process <include src="..."/> tags
	// Regex to find <include src="path/to/file.fml"/> (self-closing)
	// or <include src="path/to/file.fml">...</include> (with closing tag).
	const includeRegex =
		/<include\s+src="([^"]+?)"\s*(?:\s*\/>|>[\s\S]*?<\/include\s*>)/;
	let match;

	// Loop to find and replace include tags one by one.
	while ((match = includeRegex.exec(currentContent)) !== null) {
		const includeTag = match[0];
		const relativeSrcPath = match[1];

		const directoryOfCurrentFile = path.dirname(absoluteFilePath);
		const includedFilePath = path.resolve(
			directoryOfCurrentFile,
			relativeSrcPath
		);

		const includedContent = await parseFML(
			includedFilePath,
			variables,
			options,
			new Set(_currentlyProcessingPaths)
		);
		currentContent = currentContent.replace(includeTag, includedContent);
	}

	// After processing includes, validate the XML structure before variable substitution.
	try {
		// Wrap content in a root tag to ensure it's a valid XML document for parsing.
		// This handles files with multiple top-level elements or no elements at all.
		const wrappedContent = `<fml-root>${currentContent}</fml-root>`;
		await parseStringPromise(wrappedContent);
	} catch (error: any) {
		// Re-throw a more specific and user-friendly error if parsing fails.
		throw new Error(
			`FML syntax error in ${absoluteFilePath}: Malformed XML. Please check for unclosed or mismatched tags.\nParser error: ${error.message}`
		);
	}

	// After all includes are processed, substitute variables in the assembled content.
	let finalContent = currentContent;
	if (variables && Object.keys(variables).length > 0) {
		finalContent = mustache.render(
			currentContent,
			variables,
			{},
			{
				escape: (value) => {
					// If the value is an object, stringify it as pretty-printed JSON
					if (typeof value === 'object' && value !== null) {
						return JSON.stringify(value, null, 2);
					}
					// For non-objects (strings, numbers, etc.), just convert to string without escaping
					return String(value);
				}
			}
		);
	}

	_currentlyProcessingPaths.delete(absoluteFilePath);

	return finalContent;
}

interface StackFrame {
	getFileName(): string | null;
}

function _getCallerFile(): string | undefined {
	const originalFunc = Error.prepareStackTrace;

	let callerfile: string | undefined;
	try {
		const err = new Error();
		let currentfile: string | null | undefined;

		Error.prepareStackTrace = (
			err: Error,
			stack: NodeJS.CallSite[] | StackFrame[]
		): StackFrame[] => stack as StackFrame[];

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
