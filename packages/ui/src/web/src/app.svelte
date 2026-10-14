<script lang="ts">
	// Placeholder shell; the docs browser replaces it.
	const token =
		new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
	let status = $state('Loading…');

	$effect(() => {
		fetch('/api/status', {
			headers: { authorization: `Bearer ${token}` },
		})
			.then((response) => response.json())
			.then((body) => (status = JSON.stringify(body, null, 2)))
			.catch((error: unknown) => (status = String(error)));
	});
</script>

<h1>wiki0 docs</h1>
<pre>{status}</pre>
