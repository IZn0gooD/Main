/**
 * EncryptionService
 * Chiffrement/déchiffrement symétrique (AES-GCM) basé sur un mot de passe utilisateur.
 * - Utilise WebCrypto (PBKDF2 + AES-GCM)
 * - Forme du payload: { cipherBase64, ivBase64, saltBase64 }
 */
class EncryptionService {
	constructor() {
		this.iterations = 120000;
		this.digest = 'SHA-256';
		this.keyAlgo = { name: 'AES-GCM', length: 256 };
	}

	isEnabled() {
		const pwd = this.getPassphrase();
		return !!pwd;
	}

	getPassphrase() {
		// Le mot de passe peut être défini ailleurs (ex: via une modale)
		// Stockage local volontaire pour MVP; peut être remplacé par un prompt sécurisé plus tard.
		try {
			return localStorage.getItem('encryptionPassphrase') || '';
		} catch {
			return '';
		}
	}

	async deriveKeyFromPassphrase(passphrase, saltBytes) {
		const enc = new TextEncoder();
		const passphraseKey = await crypto.subtle.importKey(
			'raw',
			enc.encode(passphrase),
			{ name: 'PBKDF2' },
			false,
			['deriveKey']
		);
		const key = await crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: saltBytes,
				iterations: this.iterations,
				hash: this.digest
			},
			passphraseKey,
			this.keyAlgo,
			false,
			['encrypt', 'decrypt']
		);
		return key;
	}

	randomBytes(length) {
		const arr = new Uint8Array(length);
		crypto.getRandomValues(arr);
		return arr;
	}

	toBase64(bytes) {
		return btoa(String.fromCharCode(...new Uint8Array(bytes)));
	}

	fromBase64(b64) {
		const binary = atob(b64);
		const len = binary.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	}

	async encryptJson(obj, customPassphrase = null) {
		const passphrase = customPassphrase || this.getPassphrase();
		if (!passphrase) throw new Error('Passphrase non définie');
		const salt = this.randomBytes(16);
		const iv = this.randomBytes(12);
		const key = await this.deriveKeyFromPassphrase(passphrase, salt);
		const enc = new TextEncoder();
		const plaintext = enc.encode(JSON.stringify(obj));
		const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
		return {
			cipherBase64: this.toBase64(cipher),
			ivBase64: this.toBase64(iv),
			saltBase64: this.toBase64(salt)
		};
	}

	async decryptJson(payload) {
		const passphrase = this.getPassphrase();
		if (!passphrase) throw new Error('Passphrase non définie');
		const salt = this.fromBase64(payload.saltBase64);
		const iv = this.fromBase64(payload.ivBase64);
		const cipher = this.fromBase64(payload.cipherBase64);
		const key = await this.deriveKeyFromPassphrase(passphrase, salt);
		const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
		const dec = new TextDecoder();
		return JSON.parse(dec.decode(plaintext));
	}
}

// Global/window
window.EncryptionService = EncryptionService;

// Export Node/Electron
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EncryptionService;
}


