// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/example-lb3application
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {ApplicationConfig} from '@loopback/core';
import {Lb3Application} from './application';

export async function main(options: ApplicationConfig = {}) {
  const app = new Lb3Application(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  return app;
}

export {Lb3Application};
