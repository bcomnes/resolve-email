# resolve-email
[![latest version](https://img.shields.io/npm/v/resolve-email.svg)](https://www.npmjs.com/package/resolve-email)
[![Actions Status](https://github.com/bcomnes/resolve-email/workflows/tests/badge.svg)](https://github.com/bcomnes/resolve-email/actions)
[![Coverage Status](https://coveralls.io/repos/github/bcomnes/resolve-email/badge.svg?branch=master)](https://coveralls.io/github/bcomnes/resolve-email?branch=master)
[![downloads](https://img.shields.io/npm/dm/resolve-email.svg)](https://npmtrends.com/resolve-email)
[![Socket Badge](https://socket.dev/api/badge/npm/package/resolve-email)](https://socket.dev/npm/package/resolve-email)

Resolve the domain of a syntactically valid email address to see if there is even a chance of deliverability.

```
npm install resolve-email
```

## Usage

``` js
import { resolveEmail } from 'resolve-email'

// Validate the email address before passing it in here:
const results = await resolveEmail('person@gmailc.om')

console.log(results)
// results.emailResolves true/false
// results.mxRecords [array of mx records and priorities]
// results.error any errors that may have occurred.
```

## See also

This module was adapted from [nodemailer/nodemailer-direct-transport](https://github.com/nodemailer/nodemailer-direct-transport/blob/v3.3.2/lib/direct-transport.js#L438)

## License

MIT
