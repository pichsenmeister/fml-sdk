"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFML = parseFML;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mustache_1 = __importDefault(require("mustache"));
const url_1 = require("url");
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
 * @param variables An object containing key-value pairs for variable substitution.
 * @param options Optional parameters, including variables for substitution.
 * @param _currentlyProcessingPaths Internal set to track files being processed
 *                                  to detect circular dependencies. Should not be
 *                                  set by external callers.
 * @returns A promise that resolves to the parsed string content.
 * @throws Will throw an error if the file cannot be read, if Mustache rendering fails,
 *         or if a circular dependency is detected.
 */
async function parseFML(relativePath, variables, options, _currentlyProcessingPaths = new Set()) {
    let callerFile = _getCallerFile();
    if (callerFile?.startsWith('file:')) {
        callerFile = (0, url_1.fileURLToPath)(callerFile);
    }
    if (!callerFile && !options?.baseDir) {
        throw new Error('Could not determine the caller file for resolving relative paths. Please provide a baseDir option or ensure the caller file is accessible.');
    }
    const callerDir = options?.baseDir || path_1.default.dirname(callerFile || '');
    const absoluteFilePath = path_1.default.resolve(callerDir, relativePath);
    if (_currentlyProcessingPaths.has(absoluteFilePath)) {
        const cyclePath = Array.from(_currentlyProcessingPaths).join(' -> ') + ' -> ' + absoluteFilePath;
        throw new Error(`Circular dependency detected: ${cyclePath}`);
    }
    _currentlyProcessingPaths.add(absoluteFilePath);
    let currentContent = await promises_1.default.readFile(absoluteFilePath, 'utf-8');
    // Process <include src="..."/> tags
    // Regex to find <include src="path/to/file.fml"/> (self-closing)
    // or <include src="path/to/file.fml">...</include> (with closing tag).
    const includeRegex = /<include\s+src="([^"]+?)"\s*(?:\s*\/>|>[\s\S]*?<\/include\s*>)/;
    let match;
    // Loop to find and replace include tags one by one.
    while ((match = includeRegex.exec(currentContent)) !== null) {
        const includeTag = match[0];
        const relativeSrcPath = match[1];
        const directoryOfCurrentFile = path_1.default.dirname(absoluteFilePath);
        const includedFilePath = path_1.default.resolve(directoryOfCurrentFile, relativeSrcPath);
        const includedContent = await parseFML(includedFilePath, variables, options, new Set(_currentlyProcessingPaths));
        currentContent = currentContent.replace(includeTag, includedContent);
    }
    // After all includes are processed, substitute variables in the assembled content.
    let finalContent = currentContent;
    if (variables && Object.keys(variables).length > 0) {
        finalContent = mustache_1.default.render(currentContent, variables, {}, {
            escape: (value) => {
                // If the value is an object, stringify it as pretty-printed JSON
                if (typeof value === 'object' && value !== null) {
                    return JSON.stringify(value, null, 2);
                }
                // For non-objects (strings, numbers, etc.), just convert to string without escaping
                return String(value);
            },
        });
    }
    _currentlyProcessingPaths.delete(absoluteFilePath);
    return finalContent;
}
function _getCallerFile() {
    const originalFunc = Error.prepareStackTrace;
    let callerfile;
    try {
        const err = new Error();
        let currentfile;
        Error.prepareStackTrace = (err, stack) => stack;
        const stack = err.stack; // Cast to StackFrame[] after prepareStackTrace
        currentfile = stack.shift()?.getFileName();
        while (stack.length) {
            const frame = stack.shift();
            if (frame) {
                callerfile = frame.getFileName() ?? undefined;
                if (currentfile !== callerfile)
                    break;
            }
            else {
                break;
            }
        }
    }
    catch (e) { }
    Error.prepareStackTrace = originalFunc;
    return callerfile;
}
