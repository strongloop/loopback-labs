// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {model} from '@loopback/repository';
// import {TodoModelIface} from './todo.model.iface';
import {TodoBase} from './_base';
const modelDef = require('./todo.model.json');

@model(modelDef)
export class Todo extends TodoBase {
  getId() {
    return this.id;
  }
}
