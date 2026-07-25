# Contributing

## Setup

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run check
npm run build
```

## Hardware changes

Keep WebSerial and WebUSB interactions behind existing flasher boundaries. Never erase or write before validating selected hardware/chip and firmware metadata. New devices need:

- Catalog device entry with chip and flash settings
- Explicit artifact filename rule
- Size and SHA-256 metadata
- Unit tests for artifact selection and malformed metadata
- Browser-only mock tests where practical
- Physical hardware test notes in pull request

Do not include device MAC addresses, serial numbers, or unsanitized logs in issues.
