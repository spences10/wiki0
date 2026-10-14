import { describe, expect, it } from 'vite-plus/test';
import {
	allowed_host,
	content_security_policy,
	create_health_challenge,
	create_health_proof,
	health_proof_matches,
	is_authorized,
	valid_health_challenge,
} from './security.js';

describe('allowed_host', () => {
	it('accepts loopback names on the listening port', () => {
		expect(allowed_host('127.0.0.1:4100', '127.0.0.1', 4100)).toBe(
			true,
		);
		expect(allowed_host('localhost:4100', '127.0.0.1', 4100)).toBe(
			true,
		);
		expect(allowed_host('[::1]:4100', '127.0.0.1', 4100)).toBe(true);
	});

	it('rejects other hosts, other ports and a missing header', () => {
		expect(allowed_host('evil.example:4100', '127.0.0.1', 4100)).toBe(
			false,
		);
		expect(allowed_host('127.0.0.1:4101', '127.0.0.1', 4100)).toBe(
			false,
		);
		expect(allowed_host('127.0.0.1', '127.0.0.1', 4100)).toBe(false);
		expect(allowed_host(undefined, '127.0.0.1', 4100)).toBe(false);
	});

	it('accepts a configured non-loopback host', () => {
		expect(allowed_host('10.0.0.5:4100', '10.0.0.5', 4100)).toBe(
			true,
		);
	});
});

describe('is_authorized', () => {
	it('needs the exact bearer token', () => {
		expect(is_authorized('secret', 'Bearer secret')).toBe(true);
		expect(is_authorized('secret', 'Bearer other')).toBe(false);
		expect(is_authorized('secret', 'Bearer ')).toBe(false);
		expect(is_authorized('secret', 'secret')).toBe(false);
		expect(is_authorized('secret', undefined)).toBe(false);
	});
});

describe('health proof', () => {
	it('matches only for the token that made it', () => {
		const challenge = create_health_challenge();
		expect(valid_health_challenge(challenge)).toBe(true);
		const proof = create_health_proof('token', challenge);
		expect(health_proof_matches('token', challenge, proof)).toBe(
			true,
		);
		expect(health_proof_matches('other', challenge, proof)).toBe(
			false,
		);
		expect(health_proof_matches('token', challenge, 42)).toBe(false);
	});

	it('rejects malformed challenges', () => {
		expect(valid_health_challenge('short')).toBe(false);
		expect(valid_health_challenge('a'.repeat(20) + '/')).toBe(false);
		expect(valid_health_challenge(null)).toBe(false);
	});
});

describe('content_security_policy', () => {
	it('allows no inline scripts, frames, forms or base', () => {
		expect(content_security_policy).toBe(
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
		);
	});
});
