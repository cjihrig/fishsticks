'use strict';
const GitLogEmitter = require('gitlog-emitter');
const Insync = require('insync');

if (!process.argv[2]) {
  console.error('usage: node index.js config_file');
  process.exit(1);
}

const { repos, emails, startDate, endDate } = require(process.argv[2]);
const results = {};

// Setup the result object
emails.forEach((email) => {
  results[email] = {};
  repos.forEach((repo) => {
    results[email][repo] = { author: [], reviewer: [] };
  });
});


Insync.each(repos, function repoIter (repo, next) {
  const ee = new GitLogEmitter({ repo });

  ee.on('commit', (commit) => {
    if (!inDateRange(commit.date)) {
      return;
    }

    const author = getEmail(commit.author);
    const reviewers = getReviewerEmails(commit.message);

    emails.forEach((email) => {
      if (email === author) {
        results[email][repo].author.push(commit);
      }

      if (reviewers.indexOf(email) > -1) {
        results[email][repo].reviewer.push(commit);
      }
    });
  });

  ee.on('finish', next);
}, function repoCb (err) {
  if (err) {
    throw err;
  }

  emails.forEach((email) => {
    repos.forEach((repo) => {
      const stats = results[email][repo];

      console.log(`${email} authored ${stats.author.length} commits and reviewed ${stats.reviewer.length} commits in ${repo}`);
    });
  });
});


function inDateRange (dateStr) {
  if (startDate || endDate) {
    const commitDate = new Date(dateStr);

    // Make sure the time of day doesn't effect the results
    commitDate.setHours(0, 0, 0, 0);

    if (startDate && commitDate.getTime() < startDate.getTime()) {
      return false;
    }

    if (endDate && commitDate.getTime() > endDate.getTime()) {
      return false;
    }
  }

  return true;
}


function getEmail (line) {
  const match = (line.match(/<(.*)>/) || [])[1];

  return match ? match.trim() : null;
}


function getReviewerEmails (message) {
  return message.split('\n').filter((line) => {
    return /reviewed-by:/i.test(line);
  }).map((line) => {
    return getEmail(line);
  });
}
