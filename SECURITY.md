# Security Policy

## Supported versions

carsua.app is continuously deployed. Only the current `main` branch and the production deployment at https://carsua.app are supported.

## Reporting a vulnerability

Please report privately. Do not open public issues or pull requests for security problems.

- GitHub: **Security → Report a vulnerability** (private vulnerability reporting), or
- Email: security@carsua.app

Include the affected URL or endpoint, steps to reproduce, the impact, and a proof of concept if you have one.

You can expect an acknowledgement within 7 days and a status update within 30 days. Fixes are deployed as soon as they are verified. Reporters are credited in the advisory unless they prefer to stay anonymous. There is no bug bounty.

## Scope

In scope: the carsua.app web app and `/api/*`, authentication and account flows, and code or configuration in this repository.

Out of scope:

- denial-of-service or volumetric testing
- social engineering and physical attacks
- third-party services and upstream data sources (NHTSA, RDW, hosting and DNS providers)
- reports from automated scanners without a demonstrated impact
- the availability of public registry data (it is public by design)

## Safe harbor

Good-faith research within this scope will not lead to legal action. Please do not access or modify other users' data, do not degrade the service, and give us reasonable time to fix an issue before disclosing it publicly.
