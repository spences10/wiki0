import { mount } from 'svelte';
import App from './app.svelte';
import './layout.css';
import { theme } from '#lib/theme.svelte.js';

// Set the theme class before the first paint; the CSP allows no
// inline script in index.html to do it earlier.
theme.apply();

mount(App, { target: document.getElementById('app')! });
