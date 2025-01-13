document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".slideshow .slide");
    let currentSlide = 0;
  
    function showNextSlide() {
      slides[currentSlide].classList.remove("active");
      currentSlide = (currentSlide + 1) % slides.length; // Zum nächsten Bild
      slides[currentSlide].classList.add("active");
    }
  
    // Startet die Diashow: Wechselt alle 3 Sekunden
    slides[currentSlide].classList.add("active");
    setInterval(showNextSlide, 3000);
  });