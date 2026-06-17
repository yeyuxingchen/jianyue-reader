/**
 * 安全相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import {
  getAuthorizedDirs,
  addAuthorizedDir,
  removeAuthorizedDir,
  isPathAllowed,
  isEncryptionAvailable,
  encryptString,
  decryptString,
} from '../security'
import { wrapHandler } from '../errorHandler'

export function registerSecurityHandlers(): void {
  ipcMain.handle('security:getAuthorizedDirs', wrapHandler(() => {
    return getAuthorizedDirs()
  }, 'security:getAuthorizedDirs'))

  ipcMain.handle('security:addAuthorizedDir', wrapHandler((_event, dirPath: string) => {
    return addAuthorizedDir(dirPath)
  }, 'security:addAuthorizedDir'))

  ipcMain.handle('security:removeAuthorizedDir', wrapHandler((_event, dirPath: string) => {
    return removeAuthorizedDir(dirPath)
  }, 'security:removeAuthorizedDir'))

  ipcMain.handle('security:isPathAllowed', wrapHandler((_event, filePath: string) => {
    return isPathAllowed(filePath)
  }, 'security:isPathAllowed'))

  ipcMain.handle('security:isEncryptionAvailable', wrapHandler(() => {
    return isEncryptionAvailable()
  }, 'security:isEncryptionAvailable'))

  ipcMain.handle('security:encryptData', wrapHandler((_event, data: string) => {
    return encryptString(data)
  }, 'security:encryptData'))

  ipcMain.handle('security:decryptData', wrapHandler((_event, encryptedData: string) => {
    return decryptString(encryptedData)
  }, 'security:decryptData'))
}
