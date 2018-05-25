// This is an auto-generated Class file. -- DO NOT EDIT!

import {Entity, model} from '@loopback/repository';
const modelDef = require('../todo.model.json');

@model(modelDef)
export class TodoBase extends Entity {
  id?: number;
  title: string;
  desc?: string;
  isComplete?: boolean;
}
