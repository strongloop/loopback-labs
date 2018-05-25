// This is an auto-generated file -- DO NOT EDIT

import {juggler} from '@loopback/repository';
const dsConfig = require('./db.datasource.json');

export class DbDataSourceBase extends juggler.DataSource {
  constructor() {
    super(dsConfig);
  }
}
