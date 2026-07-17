import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Bookshelf from '@/pages/Bookshelf.vue'
import Reader from '@/pages/Reader.vue'
import NoteEditor from '@/pages/NoteEditor.vue'
import FloatReader from '@/pages/FloatReader.vue'
import FloatNote from '@/pages/FloatNote.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'bookshelf',
    component: Bookshelf,
    meta: { mode: 'reader', title: '书架' },
  },
  {
    path: '/reader/:bookId?',
    name: 'reader',
    component: Reader,
    meta: { mode: 'reader', title: '阅读' },
  },
  {
    path: '/note',
    name: 'note',
    component: NoteEditor,
    meta: { mode: 'note', title: '简记' },
  },
  {
    path: '/float/reader',
    name: 'float-reader',
    component: FloatReader,
    meta: { float: true, title: '浮动阅读' },
  },
  {
    path: '/float/note',
    name: 'float-note',
    component: FloatNote,
    meta: { float: true, title: '浮动笔记' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - 简阅`
  }
})

export default router
