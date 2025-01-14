/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { ux } from '@oclif/core';
import { dim, underline } from 'chalk';
import { CodeCoverageWarnings, DeployResult, Failures, Successes } from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { TestLevel, Verbosity } from '../utils/types';
import { tableHeader, error, success, check } from '../utils/output';
import { coverageOutput } from '../utils/coverage';

export class TestResultsFormatter {
  public testLevel: TestLevel | undefined;
  public verbosity: Verbosity;

  public constructor(
    protected result: DeployResult,
    protected flags: Partial<{
      'test-level': TestLevel;
      verbose: boolean;
    }>
  ) {
    this.testLevel = flags['test-level'];
    this.verbosity = this.determineVerbosity();
  }

  public displayTestResults(): void {
    if (this.testLevel === TestLevel.NoTestRun || !this.result.response.runTestsEnabled) {
      ux.log();
      return;
    }

    this.displayVerboseTestFailures();

    if (this.verbosity === 'verbose') {
      this.displayVerboseTestSuccesses();
      this.displayVerboseTestCoverage();
    }

    ux.log();
    ux.log(tableHeader('Test Results Summary'));
    ux.log(`Passing: ${this.result.response.numberTestsCompleted ?? 0}`);
    ux.log(`Failing: ${this.result.response.numberTestErrors ?? 0}`);
    ux.log(`Total: ${this.result.response.numberTestsTotal ?? 0}`);
    const time = this.result.response.details.runTestResult?.totalTime ?? 0;
    if (time) ux.log(`Time: ${time}`);
    // I think the type might be wrong in SDR
    ensureArray(this.result.response.details.runTestResult?.codeCoverageWarnings).map(
      (warning: CodeCoverageWarnings & { name?: string }) =>
        ux.warn(`${warning.name ? `${warning.name} - ` : ''}${warning.message}`)
    );
  }

  public determineVerbosity(): Verbosity {
    if (this.flags.verbose) return 'verbose';
    return 'normal';
  }

  private displayVerboseTestCoverage(): void {
    const codeCoverage = ensureArray(this.result.response.details.runTestResult?.codeCoverage);
    if (codeCoverage.length) {
      const coverage = codeCoverage.sort((a, b) => (a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1));
      ux.log();
      ux.log(tableHeader('Apex Code Coverage'));

      ux.table(coverage.map(coverageOutput), {
        name: { header: 'Name' },
        numLocations: { header: '% Covered' },
        lineNotCovered: { header: 'Uncovered Lines' },
      });
    }
  }

  private displayVerboseTestSuccesses(): void {
    const successes = ensureArray(this.result.response.details.runTestResult?.successes);
    if (successes.length > 0) {
      const testSuccesses = sortTestResults(successes);
      ux.log();
      ux.log(success(`Test Success [${successes.length}]`));
      for (const test of testSuccesses) {
        const testName = underline(`${test.name}.${test.methodName}`);
        ux.log(`${check} ${testName}`);
      }
    }
  }

  private displayVerboseTestFailures(): void {
    if (!this.result.response.numberTestErrors) return;
    const failures = ensureArray(this.result.response.details.runTestResult?.failures);
    const failureCount = this.result.response.details.runTestResult?.numFailures;
    const testFailures = sortTestResults(failures);
    ux.log();
    ux.log(error(`Test Failures [${failureCount}]`));
    for (const test of testFailures) {
      const testName = underline(`${test.name}.${test.methodName}`);
      ux.log(`• ${testName}`);
      ux.log(`  ${dim('message')}: ${test.message}`);
      if (test.stackTrace) {
        const stackTrace = test.stackTrace.replace(/\n/g, `${os.EOL}    `);
        ux.log(`  ${dim('stacktrace')}: ${os.EOL}    ${stackTrace}`);
      }
      ux.log();
    }
  }
}

function sortTestResults<T extends Failures | Successes>(results: T[]): T[] {
  return results.sort((a, b) => {
    if (a.methodName === b.methodName) {
      return a.name.localeCompare(b.name);
    }
    return a.methodName.localeCompare(b.methodName);
  });
}
