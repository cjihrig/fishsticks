# fishsticks

Something about this request smells fishy.

Parse Node core compatible git info. Commit author information is extracted from the git commit Author field. Reviewer information is extracted from `Reviewed-By:` lines in the commit message.

## Usage

Create a JavaScript file that exports a configuration object with the following properties:

- `repos` (array) - An array of strings with each string representing the path to a locally cloned git repository.
- `emails` (array) - An array of strings with each string representing an email address. Commit author and reviewer information is compared against the values in this array.
- `startDate` (date) - Only report commits that occurred on, or after this date. This value is optional. If it is not included, the start date is assumed to be the beginning of time.
- `endDate` (date) - Only report commits that occurred on, or before this date. This value is optional. If it is not included, the end date is assumed to be the end of time.

Next, run `node index.js path-to-config-file`. The application will walk the git log of each repository. For each email address, the number of relevant authored and reviewed commits will be reported.

### Sample Config File

```javascript
'use strict';
module.exports = {
  repos: [
    '/Users/peterpluck/node',
    '/Users/peterpluck/libuv'
  ],
  emails: [
    'peter@gmail.com',
    'pluck@gmail.com'
  ],
  startDate: new Date('10-01-2016'),
  endDate: new Date('10-31-2016')
};
```
