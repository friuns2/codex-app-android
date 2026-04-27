import { computed, nextTick, ref, watch, type Ref } from 'vue'
import {
  createLocalDirectory,
  createWorktree,
  getGitBranchState,
  getHomeDirectory,
  getProjectRootSuggestion,
  getWorkspaceRootsState,
  listLocalDirectories,
  openProjectRoot,
} from '../../api/codexGateway'
import type { LocalDirectoryEntry, WorktreeBranchOption } from '../../api/codexGateway'
import { getPathLeafName, getPathParent, normalizePathForUi } from '../../pathUtils.js'

type ProjectGroup = { projectName: string; threads: Array<{ cwd: string; id: string }> }
type Translate = (key: string, params?: Record<string, string>) => string

export function useAppShellProjects(options: {
  t: Translate
  projectGroups: Ref<ProjectGroup[]>
  projectDisplayNameById: Ref<Record<string, string>>
  selectedThread: Ref<{ projectName: string; cwd?: string | null } | null>
  selectedThreadId: Ref<string>
  routeName: Ref<string | symbol | undefined>
  isReviewPaneOpen: Ref<boolean>
  isMobile: Ref<boolean>
  isSidebarCollapsed: Ref<boolean>
  pinProjectToTop: (projectName: string) => void
  removeProject: (projectName: string) => Promise<void>
  reorderProject: (projectName: string, toIndex: number) => void
  renameProject: (projectName: string, displayName: string) => void
  goHome: () => void
  setSidebarCollapsed: (nextValue: boolean) => void
  replaceThread: (threadId: string) => Promise<void>
}) {
  const newThreadCwd = ref('')
  const newThreadRuntime = ref<'local' | 'worktree'>('local')
  const newWorktreeBaseBranch = ref('')
  const worktreeBranchOptions = ref<WorktreeBranchOption[]>([])
  const isLoadingWorktreeBranches = ref(false)
  const workspaceRootOptionsState = ref<{ order: string[]; labels: Record<string, string> }>({ order: [], labels: {} })
  const worktreeInitStatus = ref<{ phase: 'idle' | 'running' | 'error'; title: string; message: string }>({ phase: 'idle', title: '', message: '' })
  const defaultNewProjectName = ref('New Project (1)')
  const homeDirectory = ref('')
  const threadBranchOptions = ref<WorktreeBranchOption[]>([])
  const currentThreadBranch = ref<string | null>(null)
  const isLoadingThreadBranches = ref(false)
  const isSwitchingThreadBranch = ref(false)
  const createFolderInputRef = ref<HTMLInputElement | null>(null)
  const isCreateFolderOpen = ref(false)
  const createFolderDraft = ref('')
  const createFolderError = ref('')
  const isCreatingFolder = ref(false)
  const isExistingFolderPickerOpen = ref(false)
  const existingFolderFilterInputRef = ref<HTMLInputElement | null>(null)
  const existingFolderBrowsePath = ref('')
  const existingFolderParentPath = ref('')
  const existingFolderEntries = ref<LocalDirectoryEntry[]>([])
  const existingFolderError = ref('')
  const isExistingFolderLoading = ref(false)
  const isOpeningExistingFolder = ref(false)
  const showHiddenFolders = ref(false)
  const existingFolderFilter = ref('')
  let existingFolderBrowseRequestId = 0

  const newThreadFolderOptions = computed(() => {
    const entries: Array<{ value: string; label: string }> = []
    const seenCwds = new Set<string>()
    for (const cwdRaw of workspaceRootOptionsState.value.order) {
      const cwd = cwdRaw.trim()
      if (!cwd || seenCwds.has(cwd)) continue
      seenCwds.add(cwd)
      entries.push({
        value: cwd,
        label: workspaceRootOptionsState.value.labels[cwd] || getPathLeafName(cwd),
      })
    }
    for (const group of options.projectGroups.value) {
      const cwd = group.threads[0]?.cwd?.trim() ?? ''
      if (!cwd || seenCwds.has(cwd)) continue
      seenCwds.add(cwd)
      entries.push({
        value: cwd,
        label: options.projectDisplayNameById.value[group.projectName] ?? group.projectName,
      })
    }
    const selectedCwd = newThreadCwd.value.trim()
    if (selectedCwd && !seenCwds.has(selectedCwd)) {
      entries.unshift({
        value: selectedCwd,
        label: getPathLeafName(selectedCwd),
      })
    }
    return entries
  })
  const composerCwd = computed(() => options.selectedThread.value?.cwd?.trim() ?? newThreadCwd.value.trim())

  const newWorktreeBranchDropdownOptions = computed<Array<{ value: string; label: string }>>(() => {
    const selectedBranch = newWorktreeBaseBranch.value.trim()
    const choices = [...worktreeBranchOptions.value]
    if (selectedBranch && !choices.some((option) => option.value === selectedBranch)) {
      choices.unshift({ value: selectedBranch, label: selectedBranch })
    }
    return choices
  })
  const selectedWorktreeBranchLabel = computed(() => {
    const selectedBranch = newWorktreeBaseBranch.value.trim()
    if (!selectedBranch) return ''
    const selected = newWorktreeBranchDropdownOptions.value.find((option) => option.value === selectedBranch)
    return selected?.label ?? selectedBranch
  })
  const contentHeaderBranchDropdownValue = computed(() => currentThreadBranch.value ?? '__detached_head__')
  const contentHeaderBranchDropdownOptions = computed<Array<{ value: string; label: string }>>(() => {
    const choices: Array<{ value: string; label: string }> = [{ value: '__review__', label: 'Review' }]
    const seen = new Set<string>()
    const currentBranch = currentThreadBranch.value?.trim() ?? ''
    if (currentBranch) {
      choices.push({ value: currentBranch, label: currentBranch })
      seen.add(currentBranch)
    } else {
      choices.push({ value: '__detached_head__', label: 'Detached HEAD' })
      seen.add('__detached_head__')
    }
    for (const option of threadBranchOptions.value) {
      if (!option.value || seen.has(option.value)) continue
      seen.add(option.value)
      choices.push(option)
    }
    return choices
  })
  const createFolderParentPath = computed(() => existingFolderBrowsePath.value.trim())
  const isCreateFolderNameValid = computed(() => {
    const draft = createFolderDraft.value.trim()
    if (!draft || draft === '.' || draft === '..') return false
    return !/[\\/]/u.test(draft)
  })
  const canCreateFolder = computed(() => isCreateFolderNameValid.value && createFolderParentPath.value.trim().length > 0 && !existingFolderError.value)
  const createFolderSubmitLabel = computed(() => isCreatingFolder.value ? 'Creating…' : 'Create')
  const canBrowseExistingFolderParent = computed(() => {
    const current = existingFolderBrowsePath.value.trim()
    const parent = existingFolderParentPath.value.trim()
    return Boolean(current && parent && current !== parent)
  })
  const existingFolderDisplayEntries = computed(() => {
    const entries: Array<{ key: string; name: string; path: string; kind: 'parent' | 'directory' }> = []
    if (canBrowseExistingFolderParent.value) {
      entries.push({ key: `parent:${existingFolderParentPath.value}`, name: '..', path: existingFolderParentPath.value, kind: 'parent' })
    }
    for (const entry of existingFolderEntries.value) {
      entries.push({ key: `directory:${entry.path}`, name: entry.name, path: entry.path, kind: 'directory' })
    }
    return entries
  })
  const existingFolderFilteredEntries = computed(() => {
    const filter = existingFolderFilter.value.trim().toLowerCase()
    if (!filter) return existingFolderDisplayEntries.value
    return existingFolderDisplayEntries.value.filter((entry) => entry.kind === 'parent' || entry.name.toLowerCase().includes(filter))
  })

  function isWorktreePath(cwdRaw: string): boolean {
    const cwd = cwdRaw.trim().replace(/\\/gu, '/')
    return Boolean(cwd) && (cwd.includes('/.codex/worktrees/') || cwd.includes('/.git/worktrees/'))
  }

  function resolvePreferredLocalCwd(projectName: string, fallbackCwd = ''): string {
    const group = options.projectGroups.value.find((row) => row.projectName === projectName)
    if (!group) return fallbackCwd.trim()
    const nonWorktreeThread = group.threads.find((thread) => !isWorktreePath(thread.cwd))
    const candidate = nonWorktreeThread?.cwd?.trim() ?? group.threads[0]?.cwd?.trim() ?? ''
    return candidate || fallbackCwd.trim()
  }

  function onStartNewThread(projectName: string): void {
    const projectGroup = options.projectGroups.value.find((group) => group.projectName === projectName)
    const projectCwd = resolvePreferredLocalCwd(projectName, projectGroup?.threads[0]?.cwd?.trim() ?? '')
    if (projectCwd) newThreadCwd.value = projectCwd
    if (options.isMobile.value) options.setSidebarCollapsed(true)
    if (options.routeName.value !== 'home') options.goHome()
  }

  function onStartNewThreadFromToolbar(): void {
    const selected = options.selectedThread.value
    const cwd = selected ? resolvePreferredLocalCwd(selected.projectName, selected.cwd?.trim() ?? '') : ''
    if (cwd) newThreadCwd.value = cwd
    if (options.isMobile.value) options.setSidebarCollapsed(true)
    if (options.routeName.value !== 'home') options.goHome()
  }

  function onRenameProject(payload: { projectName: string; displayName: string }): void {
    options.renameProject(payload.projectName, payload.displayName)
  }

  async function onRemoveProject(projectName: string): Promise<void> {
    await options.removeProject(projectName)
    await loadWorkspaceRootOptionsState()
    void refreshDefaultProjectName()
  }

  function onReorderProject(payload: { projectName: string; toIndex: number }): void {
    options.reorderProject(payload.projectName, payload.toIndex)
  }

  function onSelectNewThreadFolder(cwd: string): void {
    newThreadCwd.value = cwd.trim()
    createFolderError.value = ''
  }

  function onSelectNewWorktreeBranch(branch: string): void {
    newWorktreeBaseBranch.value = branch.trim()
  }

  async function loadThreadBranches(cwd: string): Promise<void> {
    const targetCwd = cwd.trim()
    if (!targetCwd || options.routeName.value !== 'thread') {
      threadBranchOptions.value = []
      currentThreadBranch.value = null
      return
    }
    isLoadingThreadBranches.value = true
    try {
      const state = await getGitBranchState(targetCwd)
      threadBranchOptions.value = state.options
      currentThreadBranch.value = state.currentBranch
    } catch {
      threadBranchOptions.value = []
      currentThreadBranch.value = null
    } finally {
      isLoadingThreadBranches.value = false
    }
  }

  async function loadWorktreeBranches(sourceCwd: string): Promise<void> {
    const normalizedSourceCwd = sourceCwd.trim()
    if (!normalizedSourceCwd) {
      worktreeBranchOptions.value = []
      newWorktreeBaseBranch.value = ''
      return
    }
    isLoadingWorktreeBranches.value = true
    try {
      const state = await getGitBranchState(normalizedSourceCwd)
      worktreeBranchOptions.value = state.options
      const currentSelection = newWorktreeBaseBranch.value.trim()
      const hasCurrentSelection = currentSelection.length > 0 && state.options.some((option) => option.value === currentSelection)
      if (!hasCurrentSelection) {
        const preferredMainOption = state.options.find((option) => option.value.trim() === 'main')
        newWorktreeBaseBranch.value = preferredMainOption?.value ?? state.options[0]?.value ?? ''
      }
    } catch {
      worktreeBranchOptions.value = []
      newWorktreeBaseBranch.value = ''
    } finally {
      isLoadingWorktreeBranches.value = false
    }
  }

  async function submitFirstMessageForNewThread(
    text: string,
    imageUrls: string[] = [],
    skills: Array<{ name: string; path: string }> = [],
    fileAttachments: Array<{ label: string; path: string; fsPath: string }> = [],
    sendMessageToNewThread: (text: string, cwd: string, imageUrls: string[], skills: Array<{ name: string; path: string }>, fileAttachments: Array<{ label: string; path: string; fsPath: string }>) => Promise<string | null | undefined>,
    afterOpenThread?: () => void,
  ): Promise<void> {
    try {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
      let targetCwd = newThreadCwd.value
      if (newThreadRuntime.value === 'worktree') {
        worktreeInitStatus.value = {
          phase: 'running',
          title: options.t('Creating worktree'),
          message: options.t('Creating a worktree and running setup.'),
        }
        try {
          const created = await createWorktree(newThreadCwd.value, newWorktreeBaseBranch.value)
          targetCwd = created.cwd
          newThreadCwd.value = created.cwd
          worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
        } catch {
          worktreeInitStatus.value = {
            phase: 'error',
            title: options.t('Worktree setup failed'),
            message: options.t('Unable to create worktree. Try again or switch to Local project.'),
          }
          return
        }
      }
      const threadId = await sendMessageToNewThread(text, targetCwd, imageUrls, skills, fileAttachments)
      if (threadId) {
        await options.replaceThread(threadId)
        afterOpenThread?.()
      }
    } catch {
      // shared state already handles errors
    }
  }

  async function onCreateProject(): Promise<void> {
    const baseDir = await resolveProjectBaseDirectory()
    if (!baseDir) return
    await refreshDefaultProjectName()
    const suggestedName = defaultNewProjectName.value.trim() || 'New Project (1)'
    const projectName = window.prompt(`Create project in ${baseDir}`, suggestedName)
    if (projectName === null) return
    const normalizedProjectName = projectName.trim()
    if (!normalizedProjectName) return
    const targetPath = normalizeAbsolutePath(joinPath(baseDir, normalizedProjectName))
    if (!targetPath) return
    try {
      const normalizedPath = await openProjectRoot(targetPath, { createIfMissing: true, label: '' })
      if (!normalizedPath) return
      newThreadCwd.value = normalizedPath
      options.pinProjectToTop(getPathLeafName(normalizedPath))
      await loadWorkspaceRootOptionsState()
      await refreshDefaultProjectName()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create the project.'
      window.alert(message)
    }
  }

  async function onOpenExistingFolder(): Promise<void> {
    const startPath = newThreadCwd.value.trim() || await resolveProjectBaseDirectory()
    if (!startPath) return
    isCreateFolderOpen.value = false
    isExistingFolderPickerOpen.value = true
    existingFolderFilter.value = ''
    await loadExistingFolderListing(startPath)
    if (!existingFolderError.value) {
      void nextTick(() => existingFolderFilterInputRef.value?.focus())
    }
  }

  function onCloseExistingFolderPanel(): void {
    existingFolderBrowseRequestId += 1
    isExistingFolderPickerOpen.value = false
    isExistingFolderLoading.value = false
    existingFolderError.value = ''
    existingFolderFilter.value = ''
    onCloseCreateFolderPanel()
  }

  async function onBrowseExistingFolder(path: string): Promise<void> {
    if (!path || isExistingFolderLoading.value) return
    existingFolderFilter.value = ''
    await loadExistingFolderListing(path)
  }

  function onToggleHiddenFolders(): void {
    const currentPath = existingFolderBrowsePath.value.trim()
    if (!isExistingFolderPickerOpen.value || !currentPath) return
    void loadExistingFolderListing(currentPath)
  }

  function onRetryExistingFolderBrowse(): void {
    const currentPath = existingFolderBrowsePath.value.trim()
    if (!isExistingFolderPickerOpen.value || !currentPath || isExistingFolderLoading.value) return
    void loadExistingFolderListing(currentPath)
  }

  async function onConfirmExistingFolder(path = existingFolderBrowsePath.value): Promise<void> {
    const targetPath = path.trim()
    if (!targetPath) return
    existingFolderError.value = ''
    isOpeningExistingFolder.value = true
    try {
      const normalizedPath = await openProjectRoot(targetPath, { createIfMissing: false, label: '' })
      if (!normalizedPath) {
        existingFolderError.value = 'Failed to open the selected folder.'
        return
      }
      newThreadCwd.value = normalizedPath
      options.pinProjectToTop(getPathLeafName(normalizedPath))
      await loadWorkspaceRootOptionsState()
      await refreshDefaultProjectName()
      onCloseExistingFolderPanel()
    } catch (error) {
      existingFolderError.value = error instanceof Error ? error.message : 'Failed to open the selected folder.'
    } finally {
      isOpeningExistingFolder.value = false
    }
  }

  async function onOpenCreateFolderPanel(): Promise<void> {
    createFolderError.value = ''
    if (isCreateFolderOpen.value) {
      onCloseCreateFolderPanel()
      return
    }
    if (!isExistingFolderPickerOpen.value) {
      const startPath = newThreadCwd.value.trim() || await resolveProjectBaseDirectory()
      if (!startPath) return
      isExistingFolderPickerOpen.value = true
      existingFolderFilter.value = ''
      await loadExistingFolderListing(startPath)
      if (existingFolderError.value) return
    }
    if (existingFolderError.value) return
    createFolderDraft.value = defaultNewProjectName.value
    isCreateFolderOpen.value = true
    void nextTick(() => createFolderInputRef.value?.focus())
  }

  function onCloseCreateFolderPanel(): void {
    createFolderError.value = ''
    createFolderDraft.value = ''
    isCreateFolderOpen.value = false
  }

  async function onCreateFolder(): Promise<void> {
    const normalizedInput = createFolderDraft.value.trim()
    if (!normalizedInput) return
    createFolderError.value = ''
    if (existingFolderError.value) {
      createFolderError.value = 'Reload the current folder before creating a new one.'
      return
    }
    isCreatingFolder.value = true
    const baseDir = createFolderParentPath.value.trim()
    const targetPath = normalizeAbsolutePath(joinPath(baseDir, normalizedInput))
    if (!targetPath) {
      createFolderError.value = 'Unable to determine where the new folder should be created.'
      isCreatingFolder.value = false
      return
    }
    if (!isCreateFolderNameValid.value) {
      createFolderError.value = 'Enter a single folder name.'
      isCreatingFolder.value = false
      return
    }
    try {
      const normalizedPath = await createLocalDirectory(targetPath)
      if (!normalizedPath) {
        createFolderError.value = 'Failed to create the folder.'
        return
      }
      createFolderError.value = ''
      existingFolderFilter.value = ''
      await loadExistingFolderListing(normalizedPath)
      onCloseCreateFolderPanel()
    } catch (error) {
      createFolderError.value = error instanceof Error ? error.message : 'Failed to create folder.'
    } finally {
      isCreatingFolder.value = false
    }
  }

  async function applyLaunchProjectPathFromUrl(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    const launchProjectPath = new URLSearchParams(window.location.search).get('openProjectPath')?.trim() ?? ''
    if (!launchProjectPath) return false
    try {
      const normalizedPath = await openProjectRoot(launchProjectPath, { createIfMissing: false, label: '' })
      if (!normalizedPath) return false
      newThreadCwd.value = normalizedPath
      options.pinProjectToTop(getPathLeafName(normalizedPath))
      options.goHome()
      await loadWorkspaceRootOptionsState()
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('openProjectPath')
      window.history.replaceState({}, '', nextUrl.toString())
      return true
    } catch {
      return false
    }
  }

  async function resolveProjectBaseDirectory(): Promise<string> {
    const baseDir = getProjectBaseDirectory()
    if (baseDir) return baseDir
    try {
      const loadedHomeDirectory = await getHomeDirectory()
      if (loadedHomeDirectory) {
        homeDirectory.value = loadedHomeDirectory
        return loadedHomeDirectory
      }
    } catch {
      // noop
    }
    return ''
  }

  async function refreshDefaultProjectName(): Promise<void> {
    const baseDir = getProjectBaseDirectory()
    if (!baseDir) {
      defaultNewProjectName.value = 'New Project (1)'
      return
    }
    try {
      const suggestion = await getProjectRootSuggestion(baseDir)
      defaultNewProjectName.value = suggestion.name || 'New Project (1)'
    } catch {
      defaultNewProjectName.value = 'New Project (1)'
    }
  }

  function getProjectBaseDirectory(): string {
    const selected = newThreadCwd.value.trim()
    if (selected) return getPathParent(selected)
    const first = newThreadFolderOptions.value[0]?.value?.trim() ?? ''
    if (first) return getPathParent(first)
    return homeDirectory.value.trim()
  }

  async function loadHomeDirectory(): Promise<void> {
    try {
      homeDirectory.value = await getHomeDirectory()
    } catch {
      homeDirectory.value = ''
    }
  }

  async function loadWorkspaceRootOptionsState(): Promise<void> {
    try {
      const state = await getWorkspaceRootsState()
      workspaceRootOptionsState.value = { order: [...state.order], labels: { ...state.labels } }
    } catch {
      workspaceRootOptionsState.value = { order: [], labels: {} }
    }
  }

  async function loadExistingFolderListing(path: string): Promise<void> {
    const requestId = ++existingFolderBrowseRequestId
    existingFolderBrowsePath.value = normalizePathForUi(path).trim()
    existingFolderError.value = ''
    isExistingFolderLoading.value = true
    try {
      const listing = await listLocalDirectories(path, { showHidden: showHiddenFolders.value })
      if (requestId !== existingFolderBrowseRequestId) return
      existingFolderBrowsePath.value = listing.path
      existingFolderParentPath.value = listing.parentPath
      existingFolderEntries.value = listing.entries
    } catch (error) {
      if (requestId !== existingFolderBrowseRequestId) return
      existingFolderError.value = error instanceof Error ? error.message : 'Failed to load local folders.'
      existingFolderParentPath.value = getPathParent(existingFolderBrowsePath.value)
      existingFolderEntries.value = []
      onCloseCreateFolderPanel()
    } finally {
      if (requestId === existingFolderBrowseRequestId) {
        isExistingFolderLoading.value = false
      }
    }
  }

  watch(
    () => newThreadFolderOptions.value,
    (entries) => {
      if (entries.length === 0) {
        newThreadCwd.value = ''
        return
      }
      const hasSelected = entries.some((entry) => entry.value === newThreadCwd.value)
      if (!hasSelected) {
        newThreadCwd.value = entries[0].value
      }
      void refreshDefaultProjectName()
    },
    { immediate: true },
  )

  watch(
    () => newThreadCwd.value,
    () => {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
      void refreshDefaultProjectName()
    },
  )

  watch(
    () => [newThreadRuntime.value, newThreadCwd.value] as const,
    ([runtime, cwd]) => {
      if (runtime !== 'worktree') return
      void loadWorktreeBranches(cwd)
    },
    { immediate: true },
  )

  watch(
    () => newThreadRuntime.value,
    (runtime) => {
      if (runtime === 'local') {
        worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
        const current = newThreadCwd.value.trim()
        if (current && isWorktreePath(current)) {
          const fallbackProjectName = options.selectedThread.value?.projectName ?? getPathLeafName(current)
          const localCwd = resolvePreferredLocalCwd(fallbackProjectName, '')
          if (localCwd) {
            newThreadCwd.value = localCwd
          }
        }
        return
      }
      void loadWorktreeBranches(newThreadCwd.value)
    },
  )

  watch(
    () => options.routeName.value,
    (name) => {
      if (name !== 'home') {
        worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
      }
      if (name !== 'thread') {
        options.isReviewPaneOpen.value = false
      }
    },
  )

  watch(
    () => options.selectedThreadId.value,
    () => {
      worktreeInitStatus.value = { phase: 'idle', title: '', message: '' }
    },
  )

  watch(
    () => [options.routeName.value, composerCwd.value] as const,
    ([routeName, cwd]) => {
      if (routeName !== 'thread') {
        threadBranchOptions.value = []
        currentThreadBranch.value = null
        return
      }
      void loadThreadBranches(cwd)
    },
    { immediate: true },
  )

  watch(
    () => options.isMobile.value,
    (mobile) => {
      if (mobile && !options.isSidebarCollapsed.value) {
        options.setSidebarCollapsed(true)
      }
    },
    { immediate: true },
  )

  return {
    newThreadCwd,
    newThreadRuntime,
    newWorktreeBaseBranch,
    worktreeBranchOptions,
    isLoadingWorktreeBranches,
    workspaceRootOptionsState,
    worktreeInitStatus,
    newThreadFolderOptions,
    defaultNewProjectName,
    homeDirectory,
    threadBranchOptions,
    currentThreadBranch,
    isLoadingThreadBranches,
    isSwitchingThreadBranch,
    createFolderInputRef,
    isCreateFolderOpen,
    createFolderDraft,
    createFolderError,
    isCreatingFolder,
    isExistingFolderPickerOpen,
    existingFolderFilterInputRef,
    existingFolderBrowsePath,
    existingFolderParentPath,
    existingFolderEntries,
    existingFolderError,
    isExistingFolderLoading,
    isOpeningExistingFolder,
    showHiddenFolders,
    existingFolderFilter,
    newWorktreeBranchDropdownOptions,
    selectedWorktreeBranchLabel,
    contentHeaderBranchDropdownValue,
    contentHeaderBranchDropdownOptions,
    createFolderParentPath,
    isCreateFolderNameValid,
    canCreateFolder,
    createFolderSubmitLabel,
    canBrowseExistingFolderParent,
    existingFolderDisplayEntries,
    existingFolderFilteredEntries,
    isWorktreePath,
    resolvePreferredLocalCwd,
    onStartNewThread,
    onStartNewThreadFromToolbar,
    onRenameProject,
    onRemoveProject,
    onReorderProject,
    onSelectNewThreadFolder,
    onSelectNewWorktreeBranch,
    loadThreadBranches,
    loadWorktreeBranches,
    submitFirstMessageForNewThread,
    onCreateProject,
    onOpenExistingFolder,
    onCloseExistingFolderPanel,
    onBrowseExistingFolder,
    onToggleHiddenFolders,
    onRetryExistingFolderBrowse,
    onConfirmExistingFolder,
    onOpenCreateFolderPanel,
    onCloseCreateFolderPanel,
    onCreateFolder,
    applyLaunchProjectPathFromUrl,
    refreshDefaultProjectName,
    getProjectBaseDirectory,
    loadHomeDirectory,
    loadWorkspaceRootOptionsState,
  }
}

function joinPath(parent: string, child: string): string {
  const rawParent = normalizePathForUi(parent).trim()
  const normalizedChild = normalizePathForUi(child).trim().replace(/^[\\/]+/u, '')
  if (!rawParent || !normalizedChild) return ''
  const separator = rawParent.includes('\\') && !rawParent.includes('/') ? '\\' : '/'
  if (/^[a-zA-Z]:[\\/]?$/u.test(rawParent)) return `${rawParent.slice(0, 2)}${separator}${normalizedChild}`
  if (/^\/+$/u.test(rawParent)) return `/${normalizedChild}`
  const normalizedParent = rawParent.replace(/[\\/]+$/u, '')
  if (!normalizedParent) return ''
  return `${normalizedParent}${separator}${normalizedChild}`
}

function normalizeAbsolutePath(value: string): string {
  const normalizedValue = normalizePathForUi(value).trim()
  if (!normalizedValue) return ''
  const uncMatch = normalizedValue.match(/^\\\\([^\\/]+)[\\/]+([^\\/]+)([\\/].*)?$/u)
  if (uncMatch) {
    const [, server, share, suffix = ''] = uncMatch
    const segments = collapsePathSegments(suffix.split(/[\\/]+/u))
    return segments.length > 0 ? `\\\\${server}\\${share}\\${segments.join('\\')}` : `\\\\${server}\\${share}`
  }
  const driveMatch = normalizedValue.match(/^([a-zA-Z]:)([\\/].*)?$/u)
  if (driveMatch) {
    const [, drive, suffix = ''] = driveMatch
    const separator = normalizedValue.includes('\\') && !normalizedValue.includes('/') ? '\\' : '/'
    const segments = collapsePathSegments(suffix.split(/[\\/]+/u))
    return segments.length > 0 ? `${drive}${separator}${segments.join(separator)}` : `${drive}${separator}`
  }
  if (normalizedValue.startsWith('/')) {
    const segments = collapsePathSegments(normalizedValue.split('/'))
    return segments.length > 0 ? `/${segments.join('/')}` : '/'
  }
  return normalizedValue
}

function collapsePathSegments(rawSegments: readonly string[]): string[] {
  const segments: string[] = []
  for (const rawSegment of rawSegments) {
    const segment = rawSegment.trim()
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length > 0) segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments
}
