import {
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual,
} from 'node:crypto';

const health_challenge_pattern = /^[A-Za-z0-9_-]{16,128}$/u;

const loopback_hosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

// Raw HTML in docs is rendered as is, so the policy is what keeps it
// inert: no inline scripts or handlers, no frames, forms or <base>.
// Styles allow inline attributes because bits-ui and layerchart set
// them.
export const content_security_policy = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' blob: data:",
	"font-src 'self'",
	"connect-src 'self'",
	"object-src 'none'",
	"frame-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
	"frame-ancestors 'none'",
].join('; ');

export const security_headers: Record<string, string> = {
	'content-security-policy': content_security_policy,
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'no-referrer',
	'cross-origin-resource-policy': 'same-origin',
};

export function generate_token(): string {
	return randomBytes(32).toString('base64url');
}

export function is_loopback_host(host: string): boolean {
	return loopback_hosts.has(host) || host === '::1';
}

// Host header allowlist against DNS rebinding: only the loopback
// names (plus the configured host) on the port we listen on.
export function allowed_host(
	header: string | undefined,
	host: string,
	port: number,
): boolean {
	if (!header) return false;
	const allowed = new Set(
		[...loopback_hosts, host.includes(':') ? `[${host}]` : host].map(
			(name) => `${name}:${port}`,
		),
	);
	return allowed.has(header.toLowerCase());
}

function digest(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

export function is_authorized(
	token: string,
	authorization: string | undefined,
): boolean {
	if (!authorization?.startsWith('Bearer ')) return false;
	const provided = authorization.slice('Bearer '.length);
	if (!provided) return false;
	return timingSafeEqual(digest(token), digest(provided));
}

export function valid_health_challenge(
	challenge: string | null,
): challenge is string {
	return Boolean(
		challenge && health_challenge_pattern.test(challenge),
	);
}

export function create_health_challenge(): string {
	return randomBytes(24).toString('base64url');
}

// Proves a server holds the token without sending it, so a second
// `wiki0 ui` can tell its own server from whatever now has the port.
export function create_health_proof(
	token: string,
	challenge: string,
): string {
	return createHmac('sha256', token)
		.update(challenge)
		.digest('base64url');
}

export function health_proof_matches(
	token: string,
	challenge: string,
	proof: unknown,
): boolean {
	if (typeof proof !== 'string') return false;
	const expected = Buffer.from(create_health_proof(token, challenge));
	const provided = Buffer.from(proof);
	return (
		expected.length === provided.length &&
		timingSafeEqual(expected, provided)
	);
}
