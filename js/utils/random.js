// Fisher-Yates shuffle, возвращает новый массив
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Случайный элемент из массива
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Случайный целый в [min, max] включительно
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
