/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { JsonMap } from '@salesforce/ts-types';
import { TEST_REPOS_MAP } from '../testMatrix';
import { DeployResultJson } from '../../../src/utils/types';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('https://github.com/salesforcecli/sample-project-multiple-packages.git');

context('deploy metadata --metadata-dir NUTs [name: sample-project-multiple-packages]', () => {
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

  describe('--metadata-dir flag', () => {
    for (const testCase of REPO.deploy.metadataDir ?? []) {
      it(`should deploy ${testCase.toDeploy.join(', ')}`, async () => {
        const paths = testCase.toDeploy.map((t) => path.normalize(t)).join(',');
        // This is using the force:source:convert command from plugin-source. Once we have an
        // sf equivalent, we should switch it to use that.
        await testkit.convert({ args: `--sourcepath ${paths} --outputdir out` });

        const deploy = await testkit.deploy<DeployResultJson>({ args: '--metadata-dir out' });
        testkit.expect.toHavePropertyAndValue(deploy.result as unknown as JsonMap, 'status', RequestStatus.Succeeded);
      });
    }

    it('should throw an error if the directory does not exist', async () => {
      const deploy = await testkit.deploy({ args: '--metadata-dir DOES_NOT_EXIST', exitCode: 1 });
      testkit.expect.errorToHaveName(deploy, 'Error');
    });
  });
});