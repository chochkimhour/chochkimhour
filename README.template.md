<!--
  GitHub profile README — neofetch / terminal style (SVG only).
  Portrait ASCII + profile info live in assets/*_mode.svg
  Regenerate: npm run generate:svg && npm run generate
-->

<a href="{{GITHUB_URL}}">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/dark_mode.svg" />
    <img alt="{{PROFILE_NAME}} ({{GITHUB_USERNAME}}) — {{PROFILE_TITLE}}. {{PROFILE_TAGLINE}}" src="assets/light_mode.svg" />
  </picture>
</a>
