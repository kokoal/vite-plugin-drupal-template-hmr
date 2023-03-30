# vite-plugin-drupal-template-hmr

A Vite plugin that make Drupal template HMR happen 🪄.

## Motivation

When developing with Drupal and using Vite you can leverage HMR for CSS and JS but not for templating.

This plugin allow you to experiment full HMR support with Drupal.

## Limitations

For now this plugin is coming with some limitations (and needs more work):

- Only allow you to use the default templating system of Drupal (eg. [Twig](https://twig.symfony.com/)).
- Can do HMR only if the template is directly referenced as a [theme suggestion](https://www.drupal.org/docs/7/theming/overriding-themable-output/working-with-template-suggestions) in your templating system.
- If you change a template that include a lot of other templates,
all content contained in the updated template will be reloaded.
- No typescript support
- No automated testing

## Usage

1. This plugin will only be active when Vite [dev server](https://vitejs.dev/guide/cli.html#dev-server) is used.
2. To use this plugin you need to have a valid setup with Vite and Drupal.
You can use modules like https://www.drupal.org/project/vite to help you do that.
3. Install it as you would install any `npm` package. Example:

```shell
pnpm install vite-plugin-drupal-template-hmr -D
```

4. Reference the plugin in `vite.config.ts` file.
```js
import viteDrupalTemplateHMR from 'vite-plugin-drupal-template-hmr'

// @see https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // ...other plugins
    viteDrupalTemplateHMR(/* options */),
  ],
})
```

5. Add the virtual module to your backend.

Assuming your Vite dev server is `localhost:5147`:

```html
<script src="localhost:5147/@vite-plugin-drupal-template-hmr" type="module"></script>
```

## Options

```ts
{
  /**
   * Useful if your Vite root is not the same as your Drupal project/theme root.
   * For example if you have Vite and Drupal in separate Docker containers maybe you don't want to add all your
   * Drupal install into your Vite container, this will result in different root for updated files via HMR.
   */
  templateBase: string
}
```

## How it works

This plugin is leveraging Vite [HMR API](https://vitejs.dev/guide/api-hmr.html#hmr-api)
and Drupal `twig.config` with `debug` active debug mode in order to hot reload part of the page when
a template is updated.

This plugin is actively using specific Vite `handleHotUpdate` and
[Virtual Modules](https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention).

The plugin will do a `fetch` on the current URL to catch the updated HTML of the page and
do DOM manipulations when a `.twig` file is updated to replace DOM between comments added by the `twig debug mode` like so:

```html
<!-- BEGIN OUTPUT from 'themes/custom/default/templates/field/field--node--title.html.twig' -->
<span class="test">Page test</span> <!-- This will be replaced -->
<!-- END OUTPUT from 'themes/custom/default/templates/field/field--node--title.html.twig' -->
```
