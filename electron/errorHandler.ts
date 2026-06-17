/**
 * 统一错误处理模块
 */

import { app, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'

// 错误日志文件路径
let logFilePath: string | null = null

/**
 * 获取日志文件路径
 */
function getLogFilePath(): string {
  if (!logFilePath) {
    logFilePath = path.join(app.getPath('userData'), 'error.log')
  }
  return logFilePath
}

/**
 * 初始化错误处理
 */
export function setupErrorHandler(): void {
  // 主进程未捕获异常
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error)
    showErrorDialog(error)
  })

  // Promise 未处理拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection', reason)
  })

  console.log('[ErrorHandler] Initialized')
}

/**
 * 记录错误日志
 */
export function logError(type: string, error: any): void {
  const timestamp = new Date().toISOString()
  const message = error instanceof Error
    ? (error.stack || error.message)
    : String(error)

  const logEntry = `[${timestamp}] ${type}\n${message}\n\n`

  // 输出到控制台
  console.error(`[${type}]`, error)

  // 写入日志文件
  try {
    const logPath = getLogFilePath()
    fs.appendFileSync(logPath, logEntry, 'utf-8')
  } catch (err) {
    console.error('[ErrorHandler] Failed to write log:', err)
  }
}

/**
 * 显示错误对话框
 */
export function showErrorDialog(error: any, title = '错误'): void {
  const message = error instanceof Error ? error.message : String(error)

  dialog.showMessageBox({
    type: 'error',
    title,
    message: '应用发生错误',
    detail: message,
    buttons: ['确定', '查看日志'],
    defaultId: 0,
    noLink: true,
  }).then(({ response }) => {
    if (response === 1) {
      const logPath = getLogFilePath()
      if (fs.existsSync(logPath)) {
        shell.openPath(logPath)
      }
    }
  }).catch(() => {
    // 忽略对话框错误
  })
}

/**
 * 获取错误日志路径
 */
export function getErrorLogPath(): string {
  return getLogFilePath()
}

/**
 * 清空错误日志
 */
export function clearErrorLog(): void {
  try {
    const logPath = getLogFilePath()
    fs.writeFileSync(logPath, '', 'utf-8')
  } catch (err) {
    console.error('[ErrorHandler] Failed to clear log:', err)
  }
}

/**
 * 包装 IPC 处理器，添加错误处理
 */
export function wrapHandler<T extends (...args: any[]) => any>(
  handler: T,
  handlerName: string
): T {
  const wrapped = ((...args: any[]) => {
    try {
      const result = handler(...args)

      // 处理异步处理器
      if (result instanceof Promise) {
        return result.catch(err => {
          logError(`IPC Error: ${handlerName}`, err)
          throw err
        })
      }

      return result
    } catch (err) {
      logError(`IPC Error: ${handlerName}`, err)
      throw err
    }
  }) as T

  return wrapped
}
