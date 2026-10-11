// Autopilot: drive the local player from the page's own state (walk right, jump over gaps).
export const autopilot = `(() => {
  const d = window.__dbg;
  const L = d.state.level;
  const tile = (tx, ty) => (ty < 0 || ty >= L.h || tx < 0 || tx >= L.w) ? '#' : L.tiles[ty * L.w + tx];
  const step = () => {
    const p = d.localPlayer, k = d.keys;
    k.right = true; k.left = false; k.down = false; k.fire = false;
    const fx = Math.floor((p.x + p.w + 3) / 20);
    const footY = Math.floor((p.y + p.h + 1) / 20);
    const midY = Math.floor((p.y + p.h - 8) / 20);
    const gap = tile(fx, footY) === '.';
    const wall = '#X'.includes(tile(fx, midY));
    const spike = tile(fx, midY) === '^' || tile(fx + 1, midY) === '^';
    const ledge = '=C'.includes(tile(fx, footY - 2)) || '=C'.includes(tile(fx + 1, footY - 2));
    if (p.onGround && (gap || wall || spike || ledge)) { k.jump = true; k.fire = true; }
    else if (p.vy < -1) k.jump = true;   // keep holding for full jump height
    else k.jump = false;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})()`;
