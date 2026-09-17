# Testing Platform

A static prototype of a centralized AI security evaluation platform.

## Included prototype flows

- Situation-awareness dashboard
- Code evaluation and range evaluation task centers
- Expandable direction-to-domain task-scope tree for Benchmark evaluation
- Full and stratified task-selection policies
- Review reports with reproducible run and Benchmark snapshot fields
- Role-aware security data center

## Local demo

Double-click `启动Demo.cmd`, or run:

```bash
pnpm install
pnpm start:demo
```

The demo uses local mock data and a prototype administrator account. No SSO or backend service is required.

## GitHub Pages

Pushing to `main` runs `.github/workflows/deploy-pages.yml`. The deployed site is built in Demo mode, with an SPA fallback for direct URLs under the repository path.
