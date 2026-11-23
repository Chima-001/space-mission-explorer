const pad = (n) => String(n).padStart(2, "0");

/** Updates `element` every second. Returns a function that stops it. */
export function startCountdown(element, isoDate, onDone) {
  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) return () => {};
  let timer = null;

  const tick = () => {
    const seconds = Math.floor((target - Date.now()) / 1000);
    if (seconds <= 0) {
      element.textContent = "Launch time reached";
      clearInterval(timer);
      onDone?.();
      return;
    }
    element.textContent = `T- ${pad(Math.floor(seconds / 86400))}d ${pad(
      Math.floor((seconds % 86400) / 3600),
    )}h ${pad(Math.floor((seconds % 3600) / 60))}m ${pad(seconds % 60)}s`;
  };

  tick();
  timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}
