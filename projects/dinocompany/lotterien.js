// Funktion, um die JSON-Datei zu laden und die Daten anzuzeigen
async function loadLotteryNumbers() {
    try {
        const response = await fetch('lottery_numbers.json');
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der JSON-Datei');
        }

        const data = await response.json();

        if (data.numbers && data.date) {
            // Filtern und sortieren der Zahlen
            const numbers = data.numbers.filter(n => !n.special).map(n => n.value);
            const specialNumbers = data.numbers.filter(n => n.special).map(n => n.value);

            // Zahlen im HTML anzeigen
            const numbersContainer = document.getElementById("numbers");
            const specialNumbersContainer = document.getElementById("special-numbers");
            const dateContainer = document.getElementById("draw-date"); // Neues Element für das Datum

            // Für Hauptzahlen: Jede Zahl in einem eigenen div-Element
            numbersContainer.innerHTML = '';  // Sicherstellen, dass der Container leer ist
            numbers.forEach(number => {
                const numberElement = document.createElement("div");
                numberElement.classList.add("number");
                numberElement.textContent = number;
                numbersContainer.appendChild(numberElement);
            });

            // Für Spezialzahlen: Jede Zahl in einem eigenen div-Element
            specialNumbersContainer.innerHTML = '';
            specialNumbers.forEach(number => {
                const numberElement = document.createElement("div");
                numberElement.classList.add("number-special");
                numberElement.textContent = number;
                specialNumbersContainer.appendChild(numberElement);
            });

            // Datum anzeigen
            dateContainer.textContent = `${data.date}`;
        } else {
            throw new Error("Daten im JSON fehlen ('numbers' oder 'date').");
        }
    } catch (error) {
        console.error(error);
        document.getElementById("error").textContent = error.message;
    }
}

// Lade die Zahlen, sobald die Seite geladen ist
window.onload = loadLotteryNumbers;
