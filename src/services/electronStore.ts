/**
 * Electron Store 服务
 * 基于 electron-store 的键值存储
 */

/**
 * 获取存储值（同步）
 */
export function getItem(key: string): any {
  if (window.electronAPI?.store) {
    return window.electronAPI.store.get(key)
  }
  // 回退到 localStorage
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : null
}

/**
 * 设置存储值（同步）
 */
export function setItem(key: string, value: any): void {
  if (window.electronAPI?.store) {
    window.electronAPI.store.set(key, value)
    return
  }
  // 回退到 localStorage
  localStorage.setItem(key, JSON.stringify(value))
}

export const electronStore = {
  getItem,
  setItem,
}
