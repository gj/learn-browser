const LearnBrowser = (function () {
  let testCount = 0;

  const countTests = suites => {
    for (let i = 0; i < suites.length; i++) {
      if (suites[i].suites.length) {
        countTests(suites[i].suites)
      } else {
        testCount += suites[i].tests.length;
      }
    }
  };

  countTests(mocha.suite.suites);

  // Build framework of results object
  const results = {
    build: {
      test_suite: [{
        framework: 'mocha',
        formatted_output: {
          tests: [],
          pending: [],
          failures: [],
          passes: []
        }
      }]
    }
  };

  // Shortcut to access deeply-nested property
  const formatted_output = results.build.test_suite[0].formatted_output;

  function test () {
    const runner = mocha.run()
      .on('test end', test => sortTest(test))
      .on('end', () => {
        if (!['http:', 'https:'].includes(window.location.protocol)) {
          console.warn("In order to push test data to Learn's servers, you must start the test suite from your terminal with the 'learn' or 'npm test' command.");
        } else {
          if (runner.total !== testCount) {
            console.warn(`${runner.total} out of ${testCount} tests ran.`);
          }

          addCountingStats(runner);

          const payload = createPayload(results);
          postPayload(payload);
        }
      });
  }

  function sortTest (test) {
    const formattedTestOutput = formatTestOutput(test);
    formatted_output.tests.push(formattedTestOutput);

    if (test.pending) {
      formatted_output.pending.push(formattedTestOutput);
    } else if (test.state === 'passed') {
      formatted_output.passes.push(formattedTestOutput);
    } else if (test.state === 'failed') {
      formatted_output.failures.push(formattedTestOutput);
    }
  }

  function addCountingStats (runner) {
    results.examples = testCount;
    results.passing_count = runner.stats.passes;
    results.failure_count = runner.stats.failures;
    results.pending_count = runner.stats.pending;
    formatted_output.stats = runner.stats;
    results.build.test_suite[0].duration = runner.stats;
  }

  function createPayload (testResults) {
    const data = ___browserSync___.socketConfig;

    const authData = {
      username: data.username,
      github_user_id: data.github_user_id,
      learn_oauth_token: data.learn_oauth,
      repo_name: data.repo_name,
      ruby_platform: data.ruby_platform,
      ide_container: data.ide_container
    };

    return Object.assign({}, authData, testResults);
  }

  function postPayload(payload) {
    fetch('http://ironbroker-v2.flatironschool.com/e/flatiron_mocha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors' // TODO: Add CORS headers to Ironbroker
    })
      .then(response => {
        if (response.ok) {
          // Parse response and print relevant data to student, such as a confirmed submission message
        }
      })
      .catch(error => console.warn('Unable to contact Learn servers. Please check your Internet connection and try again.'));
  }

  function formatTestOutput (test) {
    return {
      title: test.title,
      fullTitle: getFullTitle(test),
      duration: test.duration,
      currentRetry: test._currentRetry,
      err: test.err
    };
  }

  function getFullTitle (test) {
    let fullTitle = test.title;
    let parent = test.parent;

    while (parent && parent.constructor.name === 'Suite') {
      fullTitle = parent.title.concat(' ', fullTitle);
      parent = parent.parent;
    }

    return fullTitle;
  }

  return {
    test: test
  };
})();
