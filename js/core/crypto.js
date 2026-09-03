/* ============================================================================
   كله — Kollo | WebCrypto Encryption (PBKDF2 + AES-GCM)
   ============================================================================ */
const Crypt = {
  async key(pass, salt) {
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },
  b64: b => btoa(String.fromCharCode(...new Uint8Array(b))),
  ub64: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  async enc(text, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await this.key(pass, salt);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text));
    return { v: 1, salt: this.b64(salt), iv: this.b64(iv), ct: this.b64(ct) };
  },
  async dec(o, pass) {
    const k = await this.key(pass, this.ub64(o.salt));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.ub64(o.iv) }, k, this.ub64(o.ct));
    return new TextDecoder().decode(pt);
  }
};

window.Crypt = Crypt;
