# Security Policy

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities. Email the repository maintainers using contact details on their GitHub profiles and include:

- Affected URL, version, or commit
- Reproduction steps
- Expected impact
- Suggested mitigation, if available

Avoid including firmware, device identifiers, serial numbers, MAC addresses, or private logs not needed to reproduce the issue. Maintainers will acknowledge reports within seven days and coordinate disclosure after a fix is available.

## Firmware trust

Flasher accepts only artifacts listed by the Fri3d firmware catalog. Downloads are checked against catalog-provided size and SHA-256 metadata before flashing. SHA-256 detects corruption but does not authenticate catalog publisher; catalog transport and hosting security remain part of trust boundary.
