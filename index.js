#!/usr/bin/env node

'use strict';
const Path = require('path');
const Bossy = require('bossy');
const GitLogEmitter = require('gitlog-emitter');
const Insync = require('insync');

const cli = {
  'c': {
    description: 'config file',
    alias: 'config',
    type: 'string',
    require: true,
    multiple: false
  },
  'r': {
    description: 'output report format',
    alias: 'report',
    type: 'string',
    require: false,
    multiple: false,
    default: 'summary',
    valid: ['summary', 'json']
  }
};

const reporters = {
  summary: reportSummary,
  json: reportJson
};

const args = Bossy.parse(cli);

if (args instanceof Error) {
  console.error(Bossy.usage(cli, 'fishsticks options'));
  process.exit(1);
}

const configPath = Path.resolve(process.cwd(), args.config);
const { repos, emails, startDate, endDate } = require(configPath);
const results = { repos: {} };

// Setup the result object
repos.forEach((repo) => {
  results.repos[repo] = { users: {}, total: [] };
  emails.forEach((email) => {
    results.repos[repo].users[email] = { author: [], reviewer: [] };
  });
});


Insync.each(repos, function repoIter (repo, next) {
  const ee = new GitLogEmitter({ repo });
  const res = results.repos[repo];

  ee.on('commit', (commit) => {
    if (!inDateRange(commit.date)) {
      return;
    }

    res.total.push(commit);

    const author = getEmail(commit.author);
    const reviewers = getReviewerEmails(commit.message);

    emails.forEach((email) => {
      if (email === author) {
        res.users[email].author.push(commit);
      }

      if (reviewers.indexOf(email) > -1) {
        res.users[email].reviewer.push(commit);
      }
    });
  });

  ee.on('finish', next);
}, function repoCb (err) {
  if (err) {
    throw err;
  }

  reporters[args.report]();
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


function reportSummary () {
  repos.forEach((repo) => {
    const res = results.repos[repo];

    console.log(`There were ${res.total.length} total commits to ${repo}.`);

    emails.forEach((email) => {
      const stats = res.users[email];

      console.log(`\t${email} authored ${stats.author.length} commits.`);
      console.log(`\t${email} reviewed ${stats.reviewer.length} commits.`);
    });
  });
}


function reportJson () {
  console.log(JSON.stringify(results));
}
