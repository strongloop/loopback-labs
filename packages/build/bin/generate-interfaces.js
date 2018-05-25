#!/usr/bin/env node

// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/build
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

const {json2tsMulti} = require('json-ts');
const fs = require('fs-extra');

const file = require('/Users/taranveer/loopback/loopback-next/examples/todo/src/models/todo.model.json');

const STRING = 'string';
const NUMBER = 123;
const BOOLEAN = true;
const BUFFER = new Buffer(STRING);
const DATE = new Date();
const NULL = null;
const OBJECT = {};
const ARRAY = [];

function generate(json) {
  const name = json.name;
  const props = json.properties;
  const keys = Object.keys(props);

  const objs = [];

  for (let i = 0; i < keys.length; i++) {
    const obj = {};
    for (const key of keys) {
      console.log(
        `i: ${i} -- key: ${key} -- props[key]: ${JSON.stringify(props[key])}`
      );
      if (props[key].required) {
        obj[key] = getTypeExample(props[key].type);
      }

      if (keys.indexOf(key) === i) {
        obj[key] = getTypeExample(props[key].type);
      }

      // Need to add a special check where if the type is an object then we
      // need to be able to iterate over it with the same code to get all
      // possible nested objects to generate the proper schema. Also need a way
      // of supporting ANY type | union type
    }
    objs.push(JSON.stringify(obj));
  }

  console.log();
  console.log(objs);
  console.log('====================');
  let iFace = json2tsMulti(objs, {rootName: name + 'Model', prefix: ''});
  console.log(iFace);
  console.log('---------------------');

  iFace = `// This is auto-generated -- DO NOT EDIT!\n// Change should be made in: #filename\n\n${iFace
    .replace(/interface/g, 'export class')
    .replace(/\s{3,}/g, '\n  ')}`;
  fs.outputFileSync(`${name.toLowerCase()}.model.iface.ts`, iFace);
}

function getTypeExample(type) {
  // return type ... use case.
  switch (type) {
    case 'string':
      return STRING;
    case 'number':
      return NUMBER;
    case 'boolean':
      return BOOLEAN;
    case 'buffer':
      return BUFFER;
    case 'date':
      return DATE;
    case 'null':
      return NULL;
    case 'object':
      return OBJECT;
    case 'array':
      return ARRAY;
  }
}

generate(file);
