#!/usr/bin/env node

// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/build
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

const fs = require('fs-extra');

const file =
  '/Users/taranveer/loopback/loopback-next/examples/todo/src/models/todo.model.json';

class ClassGenerator {
  constructor(file) {
    // Add validation to make sure it's a JSON file before reading it.
    this.file = file;
    this.lines = [];
    this.types = [];
    // this.imports = {'@loopback/repository': ['Entity'],}
    this.imports = {};
  }

  /**
   *
   * @param {*} file string - Path of JSON file.
   * @param {*} options
   */
  generate(options) {
    this.modelDef = fs.readJsonSync(this.file);
    this.options = options || {};
    if (this.modelDef.properties) {
      this.generateClass();
      // Write file
    } else {
      throw new Error(
        `No properties object exists in model definition in ${file}`
      );
    }

    this.writeFile();
  }

  generateClass() {
    const ALLOWED_BASES = ['Entity'];
    const classLines = [];
    let classLine = `export class ${this.modelDef.name}Base`;
    if (this.modelDef.base && ALLOWED_BASES.includes(this.modelDef.base)) {
      classLine += this.modelDef.base ? ` extends ${this.modelDef.base}` : '';
      this.imports['@loopback/repository'] = this.imports[
        '@loopback/repository'
      ]
        ? this.imports['@loopback/repository'].push(this.modelDef.base)
        : [this.modelDef.base];
    }
    classLine += ' {';

    this.lines.push(classLine);

    console.log(`class line: ${classLine}`);

    for (const prop in this.modelDef.properties) {
      const line = this.generatePropertyLine(
        prop,
        this.modelDef.properties[prop]
      );
      if (line) {
        this.lines.push(line);
      } else {
        console.log(
          `this.generatePropertyLine(${prop}, ${
            this.modelDef.properties[prop]
          }) didn't return a valid string!`
        );
      }
    }

    this.lines.push('}');

    console.log(this.lines);
  }

  generateObjectType(name, typeDef) {
    const typeLines = [];
    let typeLine = `export type ${name} {`;

    typeLines.push(typeLine);

    for (const prop in typeDef.properties) {
      const line = this.generatePropertyLine(prop, typeDef.properties[prop]);
      if (line) {
        typeLines.push(line);
      } else {
        console.log(
          `this.generatePropertyLine(${prop}, ${
            this.modelDef.properties[prop]
          }) didn't return a valid string!`
        );
      }
    }

    typeLines.push('}');
    this.types.push(typeLines);

    console.log(this.types);
  }

  /**
   * Array of following types are supported:
   * // {type: 'array:string'} OR type: ['string']
   * // {type: 'array:number'} OR type: ['number']
   * // {type: 'array:boolean'} OR type: ['boolean']
   * // {type: 'array:any} OR {type: 'array'} OR type:['any'] OR type:['object'] OR type:[{type:object}] (No properties)
   *
   * // Complex Object Type can be passed in as follows:
   * // type: [{type: 'object', properties: { name: {type: string, require:true}, email: {type:'string'}}}]
   *
   * @param {\} key
   * @param {*} props
   */
  generatePropertyLine(key, props) {
    console.log(`generatePropertyLine(${key}, ${JSON.stringify(props)}){}`);
    const BASIC_TYPES = ['boolean', 'number', 'string', 'any'];

    if (BASIC_TYPES.includes(props.type)) {
      return this._generatePropertyLine(key, props);
    } else if (
      props.type.includes('array') ||
      props.type.constructor === Array
    ) {
      if (props.type.includes('array:')) {
        const type = props.type.split(':')[1];
        if (BASIC_TYPES.includes(type)) {
          return this._generateArrayPropertyLine(key, props, type);
        } else {
          console.log(
            `Array property not generated. Unknown array type: ${type}`
          );
          return;
        }
      } else if (props.type.constructor === Array) {
        const type = props.type[0];
        if (typeof type === 'string') {
          if (BASIC_TYPES.includes(type)) {
            return this._generateArrayPropertyLine(key, props, type);
          } else {
            console.log(
              `Array property not generated. Unknown array type: ${type}`
            );
            return;
          }
        } else {
          // type = [{ ... }]
          if (typeof type !== 'object') {
            console.log(
              `Array property not generated. Unknown array type: ${type}`
            );
            return;
          } else {
            if (!type.properties) {
              return this._generateArrayPropertyLine(key, props, 'any');
            } else {
              const typeName = `${key.charAt(0).toUpperCase() +
                key.slice(1)}Object`;
              this.generateObjectType(name, type);
              return this._generateArrayPropertyLine(key, props, typeName);
            }
          }
        }
      } else {
        return this._generateArrayPropertyLine(key, props, 'any');
      }
    } else if (props.type === 'object') {
      if (props.type.properties) {
        const objectName = `${key.charAt(0).toUpperCase() +
          key.slice(1)}Object`;
        this.generateObjectType(objectName, props.type);
        return this._generatePropertyLine(key, props, objectName);
      } else {
        return this._generatePropertyLine(key, props, 'any');
      }
    }
  }

  _generatePropertyLine(key, props, type) {
    props.type = type || props.type;
    const propDecorator = this._generatePropertyDecorator(props);
    return `  ${propDecorator}  ${key}${props.required ? ':' : '?:'} ${
      props.type
    }${props.default ? ' = ' + props.default : ''};\n`;
  }

  _generatePropertyDecorator(props) {
    let str = '@property({\n';
    Object.entries(props).forEach(([key, val]) => {
      str += `${key}:'${val}',\n`;
    });
    str += '})\n';
    return str;
  }

  _generateArrayPropertyLine(key, props, type) {
    type = `${type}[]`;
    return this._generatePropertyLine(key, props, type);
  }

  writeFile() {
    this.lines = this.lines.join('\n');
    this.types.forEach(function(type) {
      type = type.join('\n');
    });

    this.types = this.types.join('\n');

    let content = this.lines + '\n' + this.types;
    content = this.addImports() + content;
    content = this.addHeader() + content;

    fs.outputFileSync(
      `_base/${this.modelDef.name.toLowerCase()}.base.model.ts`,
      content
    );
  }

  addImports() {
    const importLines = [];
    for (const imp in this.imports) {
      const unique = Array.from(new Set(this.imports[imp])).join(', ');
      importLines.push(`import {${unique}} from '${imp}';`);
    }
    return importLines.join('\n') + '\n\n';
  }

  addHeader() {
    const defaultHeader = `// This is an auto-generated Class file. -- DO NOT EDIT!\n\n`;
    return this.options.header || defaultHeader;
  }
}

new ClassGenerator(file).generate();
