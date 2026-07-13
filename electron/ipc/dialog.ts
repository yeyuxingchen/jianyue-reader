/**
 * 对话框相关 IPC 处理器
 */

import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { logError } from '../errorHandler'
import { ensureDir } from '../config'
import { addAuthorizedDir } from '../security'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

/**
 * 自动授权一组路径所在目录（用户已在系统对话框中明确选择，是明确授权意图）
 * 对不存在的路径静默跳过，避免噪声
 */
function authorizeDirsOfPaths(paths: Array<string | undefined>): void {
  for (const p of paths) {
    if (!p) continue
    try {
      const dir = path.dirname(p)
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        addAuthorizedDir(dir)
      }
    } catch {
      // 静默忽略单个目录授权失败，不影响主流程
    }
  }
}

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:showFilePicker', wrapHandler(async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择电子书',
      filters: [
        { name: '电子书', extensions: ['epub', 'txt', 'mobi', 'azw3', 'cbz', 'cbr'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled) return undefined
    // 用户在系统对话框中主动选择的文件，自动授权其父目录
    authorizeDirsOfPaths(result.filePaths)
    return result.filePaths
  }, 'dialog:showFilePicker'))

  ipcMain.handle('dialog:showNoteFilePicker', wrapHandler(async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开 Markdown 文件',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: '纯文本', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled) return undefined
    authorizeDirsOfPaths(result.filePaths)
    return result.filePaths
  }, 'dialog:showNoteFilePicker'))

  ipcMain.handle('dialog:showImagePicker', wrapHandler(async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择封面图片',
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled) return undefined
    authorizeDirsOfPaths(result.filePaths)
    return result.filePaths
  }, 'dialog:showImagePicker'))

  ipcMain.handle('dialog:showFontPicker', wrapHandler(async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择字体文件',
      filters: [
        { name: '字体文件', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled) return undefined
    authorizeDirsOfPaths(result.filePaths)
    return result.filePaths
  }, 'dialog:showFontPicker'))

  ipcMain.handle('dialog:showFolderPicker', wrapHandler(async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return undefined
    // 用户选中的文件夹本身需要被授权（用于扫描等后续操作）
    authorizeDirsOfPaths(result.filePaths)
    return result.filePaths[0]
  }, 'dialog:showFolderPicker'))

  ipcMain.handle('dialog:saveFile', wrapHandler(async (_event, defaultName: string, data: string | Buffer) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存位置',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    authorizeDirsOfPaths(result.filePaths)
    const savePath = path.join(result.filePaths[0], defaultName)
    fs.writeFileSync(savePath, data, typeof data === 'string' ? { encoding: 'utf-8' } : undefined)
    return savePath
  }, 'dialog:saveFile'))

  ipcMain.handle('dialog:showNoteSaveDialog', wrapHandler(async (_event, data: string) => {
    if (!mainWindow) return null

    // 在用户文档目录中扫描已有编号，生成下一个可用文件名
    const defaultDir = app.getPath('documents')
    let maxNum = 0
    try {
      const files = fs.readdirSync(defaultDir)
      const pattern = /^简记-?(\d+)\.md$/i
      for (const file of files) {
        const match = file.match(pattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
    } catch (err) { logError('IPC Error', err) }
    const nextNum = String(maxNum + 1).padStart(2, '0')
    const defaultName = `简记-${nextNum}.md`

    // 弹出系统保存对话框（文件名输入框）
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存简记',
      defaultPath: path.join(defaultDir, defaultName),
      filters: [
        { name: 'Markdown', extensions: ['md'] },
      ],
    })

    if (result.canceled || !result.filePath) return null

    // 如果目标文件已存在，自动递增编号
    let finalPath = result.filePath
    let finalFileName = path.basename(finalPath)
    const match = finalFileName.match(/^(简记)-?(\d+)\.md$/i)
    if (match && fs.existsSync(finalPath)) {
      const dir = path.dirname(finalPath)
      const prefix = match[1]
      let num = parseInt(match[2], 10)
      while (fs.existsSync(path.join(dir, `${prefix}-${String(num).padStart(2, '0')}.md`))) {
        num++
      }
      finalFileName = `${prefix}-${String(num).padStart(2, '0')}.md`
      finalPath = path.join(dir, finalFileName)
    }

    // 用户在保存对话框中选择的目录需要被授权（以便后续打开/重保存）
    authorizeDirsOfPaths([finalPath])

    fs.writeFileSync(finalPath, data, { encoding: 'utf-8' })
    return { filePath: finalPath, fileName: finalFileName }
  }, 'dialog:showNoteSaveDialog'))
}
