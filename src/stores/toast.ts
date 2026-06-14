import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ToastMessage {
  id: number
  message: string
}

export const useToastStore = defineStore('toast', () => {
  const messages = ref<ToastMessage[]>([])
  let nextId = 1

  function show(msg: string, duration = 2000) {
    const id = nextId++
    messages.value.push({ id, message: msg })
    
    setTimeout(() => {
      hide(id)
    }, duration)
  }

  function hide(id: number) {
    const index = messages.value.findIndex(m => m.id === id)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  return {
    messages,
    show,
    hide,
  }
})
