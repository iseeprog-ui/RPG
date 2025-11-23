export const rand = (a = 1, b = 0) => Math.random() * (a - b) + b;
export const randi = (a, b) => Math.floor(rand(a + 1, b));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
