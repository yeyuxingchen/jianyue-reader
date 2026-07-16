/**
 * IPC 处理器模块入口
 */

import { registerFsHandlers } from './fs'
import { registerDialogHandlers } from './dialog'
import { registerBookHandlers } from './book'
import { registerEpubHandlers } from './epub'
import { registerCoverHandlers } from './cover'
import { registerFontHandlers } from './font'
import { registerAiHandlers } from './ai'
import { registerSecurityHandlers } from './security'
import { registerWindowHandlers } from './window'
import { registerFloatHandlers } from './float'
import { registerStoreHandlers } from './store'
import { registerShellHandlers } from './shell'
import { registerClipboardHandlers } from './clipboard'
import { registerImageHandlers } from './image'
import { registerFileTreeHandlers } from './fileTree'

/**
 * 注册所有 IPC 处理器
 */
export function registerAllIpcHandlers(): void {
  registerStoreHandlers()
  registerFsHandlers()
  registerDialogHandlers()
  registerBookHandlers()
  registerEpubHandlers()
  registerCoverHandlers()
  registerFontHandlers()
  registerAiHandlers()
  registerSecurityHandlers()
  registerWindowHandlers()
  registerFloatHandlers()
  registerShellHandlers()
  registerClipboardHandlers()
  registerImageHandlers()
  registerFileTreeHandlers()
}
