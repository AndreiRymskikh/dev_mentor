const pages = [...document.querySelectorAll('.page')]

function showPage() {
  const id = (location.hash || '#landing').slice(1)
  pages.forEach(page => page.classList.toggle('active', page.id === id))
  if (!pages.some(page => page.id === id)) {
    document.querySelector('#landing').classList.add('active')
  }
  window.scrollTo({ top: 0, behavior: 'instant' })
}

window.addEventListener('hashchange', showPage)
showPage()
