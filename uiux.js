const previewTitle = document.querySelector('.preview h2');
const previewContent = document.querySelector('.preview p');
const previewImage = document.querySelector('.preview img');

// Funktion, um zu prüfen, ob alle nested Listen geschlossen sind
function checkAllClosed() {
  const allNested = document.querySelectorAll('.nested');
  return [...allNested].every(nested => nested.style.display === 'none');
}

// Funktion, um den Default-Preview-Inhalt zu zeigen
function showDefaultPreview() {
  previewTitle.textContent = "Welcome!";
  previewContent.textContent = "You can choose a prototype from the menu of the left side.";
  if (previewImage) {
    previewImage.src = "";
    previewImage.alt = "";
  }
}

// Alle Tree-Buttons (toggle) zum Auf-/Zuklappen (Pfeile)
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
        // Nested wird geschlossen -> alle ausgewählten nested items in diesem Bereich entfernen
        nested.querySelectorAll('.selected').forEach(item => item.classList.remove('selected'));
      }

      if (checkAllClosed()) {
        showDefaultPreview();
      }
    }
  });
});

// Klick auf Tree-Button (nicht nur Pfeil)
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

// Vorschau aktualisieren bei Klick auf finale Prototypen (ohne Kinder)
document.querySelectorAll('.nested li').forEach(item => {
  item.addEventListener('click', () => {
    // Auswahl visuell setzen (hier optional, je nachdem ob du markierung willst)
    document.querySelectorAll('.nested li.selected').forEach(sel => sel.classList.remove('selected'));
    item.classList.add('selected');

    const prototypeName = item.textContent.trim();

    // Vorschau aktualisieren (Hier kannst du echten Content einfügen)
    previewTitle.textContent = prototypeName;
    previewContent.innerHTML = `Hier kommt die Vorschau für <strong>${prototypeName}</strong>.`;

    // Optional: Bild anzeigen, wenn vorhanden
    if (previewImage) {
      previewImage.src = `prototypes/${prototypeName.toLowerCase().replace(/\s+/g, '_')}.png`;
      previewImage.alt = `${prototypeName} Preview`;
    }
  });
});

// Beim Laden: alle nested Listen schließen und Pfeile zurücksetzen, Default Preview zeigen
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nested').forEach(nested => nested.style.display = 'none');
  document.querySelectorAll('.toggle').forEach(toggle => toggle.textContent = '▶');
  showDefaultPreview();
});

// "X"-Button schließt Fenster (hier: zurück zur index.html)
document.querySelector('.btn-close').addEventListener('click', () => {
  window.location.href = 'index.html';
});
