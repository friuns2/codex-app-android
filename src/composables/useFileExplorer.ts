import { computed, ref, watch, type Ref } from 'vue'
import {
  getFilePathMetadata,
  readDirectoryEntries,
  readFileContentsBase64,
  type FileExplorerEntry,
  type FilePathMetadata,
} from '../api/codexGateway'
import {
  getParentFilePath,
  getPathLeafName,
  isAbsoluteFilePath,
  resolveFilePath,
} from '../utils/fileExplorer'

export type FilePreviewState =
  | { kind: 'empty' }
  | { kind: 'directory'; entryCount: number }
  | { kind: 'text'; text: string; language: string }
  | { kind: 'image'; src: string; mimeType: string }
  | { kind: 'unsupported'; reason: string }
  | { kind: 'error'; message: string }

const TEXT_FILE_EXTENSIONS = new Set([
  '', '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.scss',
  '.html', '.htm', '.xml', '.yml', '.yaml', '.log', '.csv', '.env', '.py',
  '.sh', '.toml', '.ini', '.conf', '.sql', '.bat', '.cmd', '.ps1', '.c',
  '.cc', '.cpp', '.cxx', '.h', '.hpp', '.java', '.go', '.rs', '.rb', '.php',
])

const TEXT_FILE_BASENAMES = new Set([
  'dockerfile', 'makefile', 'readme', 'license', '.gitignore', '.gitattributes',
])

const IMAGE_FILE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
}

const CODE_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.sh': 'bash',
  '.zsh': 'bash',
  '.css': 'css',
  '.scss': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.json': 'json',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql',
  '.toml': 'ini',
  '.ini': 'ini',
  '.conf': 'ini',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
}

function getLowercaseExtension(pathValue: string): string {
  const leaf = getPathLeafName(pathValue)
  const dotIndex = leaf.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return leaf.slice(dotIndex).toLowerCase()
}

function getLowercaseBaseName(pathValue: string): string {
  return getPathLeafName(pathValue).toLowerCase()
}

function isTextPreviewable(pathValue: string): boolean {
  const extension = getLowercaseExtension(pathValue)
  if (TEXT_FILE_EXTENSIONS.has(extension)) return true
  return TEXT_FILE_BASENAMES.has(getLowercaseBaseName(pathValue))
}

function getImageMimeType(pathValue: string): string | null {
  return IMAGE_FILE_MIME_TYPES[getLowercaseExtension(pathValue)] ?? null
}

function getTextLanguage(pathValue: string): string {
  const extension = getLowercaseExtension(pathValue)
  return CODE_LANGUAGE_BY_EXTENSION[extension] ?? 'plaintext'
}

function decodeBase64Utf8(value: string): string {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new TextDecoder().decode(bytes)
}

export function useFileExplorer(options: {
  path: Ref<string>
  cwd: Ref<string>
}) {
  const isLoading = ref(false)
  const listingError = ref('')
  const locationError = ref('')
  const currentDirectoryPath = ref('')
  const selectedPath = ref('')
  const selectedMetadata = ref<FilePathMetadata | null>(null)
  const entries = ref<FileExplorerEntry[]>([])
  const preview = ref<FilePreviewState>({ kind: 'empty' })
  let loadToken = 0

  const resolvedPath = computed(() => resolveFilePath(options.path.value, options.cwd.value))

  async function loadDirectory(pathValue: string, token: number): Promise<void> {
    try {
      const nextEntries = await readDirectoryEntries(pathValue)
      if (token !== loadToken) return
      entries.value = nextEntries
      listingError.value = ''
    } catch (error) {
      if (token !== loadToken) return
      entries.value = []
      listingError.value = error instanceof Error ? error.message : 'Failed to load directory'
    }
  }

  async function loadPreview(pathValue: string, token: number): Promise<void> {
    const imageMimeType = getImageMimeType(pathValue)
    if (imageMimeType) {
      try {
        const dataBase64 = await readFileContentsBase64(pathValue)
        if (token !== loadToken) return
        preview.value = {
          kind: 'image',
          src: `data:${imageMimeType};base64,${dataBase64}`,
          mimeType: imageMimeType,
        }
      } catch (error) {
        if (token !== loadToken) return
        preview.value = {
          kind: 'error',
          message: error instanceof Error ? error.message : 'Failed to load image preview',
        }
      }
      return
    }

    if (!isTextPreviewable(pathValue)) {
      preview.value = {
        kind: 'unsupported',
        reason: 'This file type does not have an inline preview in V1.',
      }
      return
    }

    try {
      const dataBase64 = await readFileContentsBase64(pathValue)
      if (token !== loadToken) return
      preview.value = {
        kind: 'text',
        text: decodeBase64Utf8(dataBase64),
        language: getTextLanguage(pathValue),
      }
    } catch (error) {
      if (token !== loadToken) return
      preview.value = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to load file preview',
      }
    }
  }

  async function reload(): Promise<void> {
    const nextToken = loadToken + 1
    loadToken = nextToken
    isLoading.value = true
    locationError.value = ''
    listingError.value = ''
    entries.value = []
    selectedPath.value = ''
    selectedMetadata.value = null
    preview.value = { kind: 'empty' }

    const targetPath = resolvedPath.value.trim()
    if (!targetPath || !isAbsoluteFilePath(targetPath)) {
      currentDirectoryPath.value = ''
      locationError.value = 'Expected an absolute filesystem path.'
      isLoading.value = false
      return
    }

    try {
      const metadata = await getFilePathMetadata(targetPath)
      if (nextToken !== loadToken) return
      selectedMetadata.value = metadata

      if (metadata.isDirectory) {
        currentDirectoryPath.value = targetPath
        await loadDirectory(targetPath, nextToken)
        if (nextToken !== loadToken) return
        preview.value = {
          kind: 'directory',
          entryCount: entries.value.length,
        }
        isLoading.value = false
        return
      }

      if (metadata.isFile) {
        selectedPath.value = targetPath
        const parentPath = getParentFilePath(targetPath)
        currentDirectoryPath.value = parentPath || targetPath
        if (parentPath) {
          await loadDirectory(parentPath, nextToken)
        } else {
          entries.value = []
          listingError.value = 'Parent directory is unavailable.'
        }
        await loadPreview(targetPath, nextToken)
        if (nextToken !== loadToken) return
        isLoading.value = false
        return
      }

      currentDirectoryPath.value = targetPath
      locationError.value = 'The selected path is not a regular file or directory.'
    } catch (error) {
      if (nextToken !== loadToken) return
      currentDirectoryPath.value = ''
      locationError.value = error instanceof Error ? error.message : 'Failed to load path'
    } finally {
      if (nextToken === loadToken) {
        isLoading.value = false
      }
    }
  }

  watch(
    () => [options.path.value, options.cwd.value] as const,
    () => {
      void reload()
    },
    { immediate: true },
  )

  return {
    currentDirectoryPath,
    entries,
    isLoading,
    listingError,
    locationError,
    preview,
    reload,
    resolvedPath,
    selectedMetadata,
    selectedPath,
  }
}
