/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('deploy metadata --source-dir NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: path.join(process.cwd(), 'bin', 'dev'),
      nut: __filename,
    });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch (e) {
      // if it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--source-dir flag', () => {
    for (const testCase of REPO.deploy.sourceDir) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const args = testCase.toDeploy.map((t) => `--source-dir ${path.normalize(t)}`).join(' ');
        const deploy = await testkit.deploy<{ files: FileResponse[] }>({ args });
        await testkit.expect.filesToBeDeployedViaResult(testCase.toVerify, testCase.toIgnore, deploy.result.files);
      });
    }

    it('should throw an error if the directory does not exist', async () => {
      const deploy = await testkit.deploy({ args: '--source-dir DOES_NOT_EXIST', exitCode: 1 });
      testkit.expect.errorToHaveName(deploy, 'SfdxError');
    });
  });
});