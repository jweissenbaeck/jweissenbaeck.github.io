const previewTitle = document.querySelector('.preview h2');
const previewContent = document.querySelector('.preview p');
const previewImage = document.getElementById('previewImage');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// Funktion: prüfen, ob alle nested Listen geschlossen sind
function checkAllClosed() {
  const allNested = document.querySelectorAll('.nested');
  return [...allNested].every(nested => nested.style.display === 'none');
}

// Funktion: Default Preview anzeigen
function showDefaultPreview() {
  previewTitle.textContent = "Welcome!";
  previewContent.textContent = "You can choose a prototype from the menu of the left side.";
  previewImage.src = "";
  previewImage.alt = "";
  previewImage.style.display = 'none';
  fullscreenBtn.style.display = 'none';
}

// Toggle-Funktion für Pfeile
document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const parent = toggle.parentElement;
    const nested = parent.querySelector('.nested');
    if (nested) {
      const isVisible = nested.style.display === 'block';
      nested.style.display = isVisible ? 'none' : 'block';
      toggle.textContent = isVisible ? '▶' : '▼';

      if (isVisible) {
        nested.querySelectorAll('.selected').forEach(item => item.classList.remove('selected'));
      }

      if (checkAllClosed()) {
        showDefaultPreview();
      }
    }
  });
});

// Klick auf Tree-Button (ganze Zeile)
document.querySelectorAll('.tree-item-button').forEach(button => {
  button.addEventListener('click', () => {
    const nested = button.parentElement.querySelector('.nested');
    const toggle = button.querySelector('.toggle');
    if (nested && toggle) {
      const isVisible = nested.style.display === 'block';
      nested.style.display = isVisible ? 'none' : 'block';
      toggle.textContent = isVisible ? '▶' : '▼';

      if (isVisible) {
        nested.querySelectorAll('.selected').forEach(item => item.classList.remove('selected'));
      }

      if (checkAllClosed()) {
        showDefaultPreview();
      }
    }
  });
});

// Klick auf finale Elemente (nested li)
document.querySelectorAll('.nested li').forEach(item => {
  item.addEventListener('click', () => {
    // Markierung aktualisieren
    document.querySelectorAll('.nested li.selected').forEach(sel => sel.classList.remove('selected'));
    item.classList.add('selected');

    const prototypeName = item.firstChild.textContent.trim();
    const descElement = item.querySelector('.description');
    const desc = descElement ? descElement.innerHTML : `Hier kommt die Vorschau für ${prototypeName}.`;

    previewTitle.textContent = prototypeName;
    previewContent.innerHTML = desc;

    // Bildquelle aus data-img Attribut oder automatisch
    const imgSrc = item.dataset.img || `uiux_designs/${prototypeName.toLowerCase().replace(/\s+/g, '_')}.png`;
    previewImage.src = imgSrc;
    previewImage.alt = `${prototypeName} Preview`;
    previewImage.style.display = 'block';

    // Button anzeigen
    fullscreenBtn.style.display = 'inline-block';
  });
});

// Fullscreen Button Funktion
fullscreenBtn.addEventListener('click', () => {
  if (previewImage && previewImage.src) {
    if (previewImage.requestFullscreen) {
      previewImage.requestFullscreen();
    } else if (previewImage.webkitRequestFullscreen) {
      previewImage.webkitRequestFullscreen();
    } else if (previewImage.msRequestFullscreen) {
      previewImage.msRequestFullscreen();
    }
  }
});

// Beim Laden: alles schließen und Default anzeigen
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nested').forEach(nested => nested.style.display = 'none');
  document.querySelectorAll('.toggle').forEach(toggle => toggle.textContent = '▶');
  showDefaultPreview();
});

// "X"-Button schließt Fenster (hier: zurück zur index.html)
document.querySelector('.btn-close').addEventListener('click', () => {
  window.location.href = 'index.html';
});
