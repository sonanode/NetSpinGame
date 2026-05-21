/** Deterrent only — cannot fully block DevTools in a browser */

(function () {
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    const key = e.key?.toUpperCase();
    if (key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
      e.preventDefault();
    }
    if (e.ctrlKey && key === 'U') e.preventDefault();
  });

  const block = () => {
    console.clear();
    console.log('%cStop', 'color:#f0f;font-size:24px;font-weight:bold');
    console.log('Game logic runs on the server.');
  };
  block();
  setInterval(block, 2000);
})();
