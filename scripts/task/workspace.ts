import { readFileSync, writeFileSync } from 'node:fs'
import { workspaceFile } from './paths.ts'

type WorkspaceFolder = { name: string; path: string }

type WorkspaceDoc = {
  folders: WorkspaceFolder[]
  settings?: Record<string, unknown>
}

/** Reads the Cursor workspace JSON next to the worktrees. */
const readWorkspace = (): WorkspaceDoc => {
  const raw = readFileSync(workspaceFile(), 'utf8')
  return JSON.parse(raw) as WorkspaceDoc
}

/** Writes the workspace JSON with a trailing newline. */
const writeWorkspace = (doc: WorkspaceDoc): void => {
  writeFileSync(workspaceFile(), `${JSON.stringify(doc, null, 2)}\n`)
}

/**
 * Ensures `folders` contains `{ name, path }` for the branch (idempotent).
 * Returns whether a new entry was added.
 */
export const ensureWorkspaceFolder = (branch: string): boolean => {
  const doc = readWorkspace()
  if (doc.folders.some((folder) => folder.path === branch || folder.name === branch)) {
    return false
  }
  doc.folders.push({ name: branch, path: branch })
  writeWorkspace(doc)
  return true
}

/**
 * Removes the folder entry whose name and path both equal the branch.
 * Returns whether an entry was removed.
 */
export const removeWorkspaceFolder = (branch: string): boolean => {
  const doc = readWorkspace()
  const before = doc.folders.length
  doc.folders = doc.folders.filter((folder) => !(folder.name === branch && folder.path === branch))
  if (doc.folders.length === before) return false
  writeWorkspace(doc)
  return true
}
