import { createRouter, createWebHashHistory } from 'vue-router'

const EmptyRouteView = {
  render: () => null,
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: EmptyRouteView,
    },
    {
      path: '/pulse',
      name: 'pulse',
      component: EmptyRouteView,
    },
    {
      path: '/thread/:threadId',
      name: 'thread',
      component: EmptyRouteView,
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: EmptyRouteView,
    },
    {
      path: '/automations',
      name: 'automations',
      component: EmptyRouteView,
    },
    {
      path: '/skills',
      name: 'skills',
      component: EmptyRouteView,
    },
    {
      path: '/files',
      name: 'files',
      component: EmptyRouteView,
    },
    {
      path: '/new-thread',
      redirect: { name: 'home' },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

export default router
