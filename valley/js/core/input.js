export const INPUT = { mx: 0, my: 0, run: false, gatherHeld: false, lookCb: null };

export function setupInput({ joyZone, joyBase, joyKnob, canvas, btnRun }) {
  const keys = {};
  let joyId = null, lookId = null, lookX = 0, lookY = 0;
  const MAX = 52;

  const joyRect = () => joyBase.getBoundingClientRect();

  joyZone.addEventListener('pointerdown', e => {
    if (joyId !== null) return;
    joyId = e.pointerId;
    joyZone.setPointerCapture(e.pointerId);
    moveJoy(e);
  });
  joyZone.addEventListener('pointermove', e => { if (e.pointerId === joyId) moveJoy(e); });
  const endJoy = e => {
    if (e.pointerId !== joyId) return;
    joyId = null; joyBase._x = joyBase._y = 0;
    joyKnob.style.transform = 'translate(0,0)'; refresh();
  };
  joyZone.addEventListener('pointerup', endJoy);
  joyZone.addEventListener('pointercancel', endJoy);

  function moveJoy(e) {
    const r = joyRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > MAX) { dx *= MAX / len; dy *= MAX / len; }
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    joyBase._x = dx / MAX; joyBase._y = dy / MAX;
    refresh();
  }

  // свайп по экрану = поворот камеры
  canvas.addEventListener('pointerdown', e => {
    if (lookId !== null) return;
    lookId = e.pointerId; lookX = e.clientX; lookY = e.clientY;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    INPUT.lookCb?.(e.clientX - lookX, e.clientY - lookY);
    lookX = e.clientX; lookY = e.clientY;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);

  btnRun.addEventListener('click', () => { INPUT.run = !INPUT.run; btnRun.classList.toggle('on', INPUT.run); });

  // клавиатура — для теста на ПК
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyE') INPUT.gatherHeld = true;
    if (e.code === 'ShiftLeft') INPUT.run = true;
  });
  addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'KeyE') INPUT.gatherHeld = false;
    if (e.code === 'ShiftLeft') INPUT.run = false;
  });

  function refresh() {
    let kx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    let ky = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    INPUT.mx = (joyBase._x || 0) + kx;
    INPUT.my = (joyBase._y || 0) + ky;
    const l = Math.hypot(INPUT.mx, INPUT.my);
    if (l > 1) { INPUT.mx /= l; INPUT.my /= l; }
  }
  setInterval(refresh, 50); // подхват клавиатуры без событий
  document.addEventListener('contextmenu', e => e.preventDefault());
}
