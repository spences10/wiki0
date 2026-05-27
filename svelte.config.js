import adapter from "@sveltejs/adapter-auto";
import { mdsvex } from "mdsvex";

/** @type {(param: { filename: string }) => boolean | undefined} */
const runes = (param) =>
  param.filename.split(/[/\\]/).includes("node_modules") ? undefined : true;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes,
  },
  kit: {
    adapter: adapter(),
    files: {
      appTemplate: "apps/wiki0-web/src/app.html",
      assets: "apps/wiki0-web/static",
      lib: "apps/wiki0-web/src/lib",
      routes: "apps/wiki0-web/src/routes",
      serviceWorker: "apps/wiki0-web/src/service-worker",
      params: "apps/wiki0-web/src/params",
    },
    outDir: "apps/wiki0-web/.svelte-kit",
  },
  preprocess: [mdsvex({ extensions: [".svx", ".md"] })],
  extensions: [".svelte", ".svx", ".md"],
};

export default config;
