/**
 * electron-store 相关 IPC 处理器
 */

import { ipcMain, app } from 'electron'
import Store from 'electron-store'
import { wrapHandler } from '../errorHandler'

let store: any = null

function getStore() {
  if (!store) {
    store = new Store({
      name: 'jianyue-reader',
      cwd: app.getPath('userData'),
    })
  }
  return store
}

export function registerStoreHandlers(): void {
  ipcMain.handle('store:get', wrapHandler((_event, key: string) => {
    const s = getStore()
    return s.get(key)
  }, 'store:get'))

  ipcMain.handle('store:set', wrapHandler((_event, key: string, value: any) => {
    const s = getStore()
    s.set(key, value)
  }, 'store:set'))
}
