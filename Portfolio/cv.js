document.querySelector('.cv-btn-close').addEventListener('click', () => {
  window.location.href = 'index.html';
});

function updateHeaderText() {
  const headerSpan = document.querySelector('.cv-header span');
  if (window.innerWidth <= 768) {
    headerSpan.textContent = 'Curriculum Vitae';
  } else {
    headerSpan.textContent = 'Curriculum Vitae – Jacob Weissenbäck';
  }
}

// Direkt beim Laden der Seite ausführen
updateHeaderText();

// Beim Fenster-Resize ebenfalls ausführen
window.addEventListener('resize', updateHeaderText);