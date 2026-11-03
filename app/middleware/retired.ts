export default defineNuxtRouteMiddleware(() => {
  // Sections whose data is not published yet redirect home instead of showing an empty shell.
  return navigateTo('/', { replace: true })
})
