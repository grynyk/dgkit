# Security Policy

## Supported versions

The latest published minor of each `@dgkit/*` package receives security fixes.

## Reporting a vulnerability

For for security problems report privately via GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository with:

- the affected package and version,
- a description and impact assessment,
- reproduction steps or a proof of concept.

## Handling of secrets

This repository contains **no** credentials. Publishing uses the `NPM_TOKEN`
GitHub Actions secret and short-lived OIDC provenance. Never commit tokens,
`.env` files, or a token-bearing `.npmrc`.
