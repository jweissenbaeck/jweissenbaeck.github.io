document.querySelectorAll('.poster-item').forEach(item => {
    item.addEventListener('click', function() {
        document.getElementById('modalImg').src = this.dataset.img;
        document.getElementById('modalImg').alt = this.dataset.title;
        document.getElementById('modalTitle').textContent = this.dataset.title;
        document.getElementById('modalDesc').textContent = this.dataset.desc;
        const modal = document.getElementById('posterModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    });
});

// Close modal when clicking the close (X) button
document.getElementById('modalClose').onclick = function() {
    const modal = document.getElementById('posterModal');
    modal.classList.remove('show'); // Remove animation class
    setTimeout(() => modal.style.display = 'none', 400); // Hide modal after animation
};

// Close modal when clicking outside the modal content
document.getElementById('posterModal').onclick = function(e) {
    if (e.target === this) {
        this.classList.remove('show');
        setTimeout(() => this.style.display = 'none', 400);
    }
};

// Fullscreen button: open the modal image in fullscreen mode
document.getElementById('fullscreenBtn').onclick = function(e) {
    e.stopPropagation(); // Prevent modal from closing
    const img = document.getElementById('modalImg');
    if (img.requestFullscreen) {
        img.requestFullscreen();
    } else if (img.webkitRequestFullscreen) { // Safari
        img.webkitRequestFullscreen();
    } else if (img.msRequestFullscreen) { // IE11
        img.msRequestFullscreen();
    }
};