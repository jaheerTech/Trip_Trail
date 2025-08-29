function explore() {
  window.location.href = 'destinations.html';
}

  // Auto sliding carousel for features section (3 cards visible, slide by 1)
  (function initFeaturesSlider() {
    const viewport = document.querySelector('.features .viewport');
    const track = document.querySelector('.features .cards');
    if (!viewport || !track) return;

    const cards = Array.from(track.children);
    if (cards.length <= 3) return;

    let currentIndex = 0;
    const gapPx = getComputedStyle(track).gap || '16px';
    const gap = parseInt(gapPx, 10) || 16;

    function getCardWidth() {
      const first = cards[0];
      if (!first) return 0;
      const style = getComputedStyle(first);
      return first.getBoundingClientRect().width + gap;
    }

    function updateTransform() {
      const cardWidth = getCardWidth();
      track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
    }

    function step() {
      currentIndex += 2;
      const maxIndex = cards.length - 2; // last fully-visible start index with 2 visible
      if (currentIndex > maxIndex) {
        currentIndex = 0;
      }
      updateTransform();
    }

    // Resize handling keeps slide distance accurate
    let resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateTransform, 150);
    });

    updateTransform();
    setInterval(step, 2800);
  })();