import { signUp, signIn, signInWithGoogle } from '../auth/supabase.js';

let onAuthSuccess = null;
let onGuest = null;
let mode = 'login'; // 'login' | 'register'

export function initAuthScreen({ onSuccess, onGuestMode }) {
  onAuthSuccess = onSuccess;
  onGuest = onGuestMode;

  document.getElementById('btn-auth-toggle').addEventListener('click', toggleMode);
  document.getElementById('btn-auth-submit').addEventListener('click', handleSubmit);
  document.getElementById('btn-google').addEventListener('click', handleGoogle);
  document.getElementById('btn-guest').addEventListener('click', () => onGuest());

  // Отправка по Enter
  document.getElementById('auth-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSubmit();
  });
}

function toggleMode() {
  mode = mode === 'login' ? 'register' : 'login';
  updateModeUI();
}

function updateModeUI() {
  const isLogin = mode === 'login';
  document.getElementById('auth-title').textContent       = isLogin ? 'Войти' : 'Регистрация';
  document.getElementById('btn-auth-submit').textContent  = isLogin ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('btn-auth-toggle').textContent  = isLogin
    ? 'Нет аккаунта? Зарегистрироваться →'
    : 'Уже есть аккаунт? Войти →';
  setError('');
}

async function handleSubmit() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { setError('Введи email и пароль'); return; }

  setLoading(true);
  try {
    const { data, error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) { setError(translateError(error.message)); return; }

    if (mode === 'register' && !data.session) {
      setError('Письмо отправлено — подтверди email, потом войди.');
      return;
    }
    onAuthSuccess(data.user ?? data.session?.user);
  } catch {
    setError('Ошибка сети. Попробуй ещё раз.');
  } finally {
    setLoading(false);
  }
}

async function handleGoogle() {
  setLoading(true);
  await signInWithGoogle();
  // Supabase редиректит — страница перезагрузится
}

function setError(msg) {
  document.getElementById('auth-error').textContent = msg;
}

function setLoading(on) {
  document.getElementById('btn-auth-submit').disabled = on;
  document.getElementById('btn-google').disabled      = on;
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed'))       return 'Подтверди email и попробуй снова';
  if (msg.includes('User already registered'))   return 'Этот email уже зарегистрирован — войди';
  if (msg.includes('Password should be'))        return 'Пароль должен быть минимум 6 символов';
  return msg;
}
