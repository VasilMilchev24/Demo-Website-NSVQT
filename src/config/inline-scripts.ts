/**
 * The only inline script on the site. Its SHA-256 hash is whitelisted in the CSP (vercel.json);
 * a test asserts the hash stays in sync with this exact string.
 */
export const JS_CLASS_SCRIPT = "document.documentElement.classList.add('js')";
