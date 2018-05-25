// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const ArtifactGenerator = require('../../lib/artifact-generator');
const debug = require('../../lib/debug')('model-generator');
const path = require('path');
const utils = require('../../lib/utils');

module.exports = class ModelGenerator extends ArtifactGenerator {
  constructor(args, opts) {
    super(args, opts);
  }

  _setupGenerator() {
    this.artifactInfo = {
      type: 'model',
      rootDir: 'src',
    };

    this.artifactInfo.outDir = path.resolve(
      this.artifactInfo.rootDir,
      'models'
    );

    return super._setupGenerator();
  }

  checkLoopBackProject() {
    return super.checkLoopBackProject();
  }

  promptArtifactName() {
    debug('prompting for artifact name');
    if (this.shouldExit()) return false;
    const prompts = [
      {
        name: 'name',
        type: 'input',
        suffix: ':',
        message: utils.toClassName(this.artifactInfo.type) + ' name',
        when: this.artifactInfo.name === undefined,
        validate: utils.validateClassName,
      },
    ];

    return this.prompt(prompts).then(props => {
      Object.assign(this.artifactInfo, props);
      return props;
    });
  }

  promptModelBase() {
    const baseOptions = ['Entity', 'ValueObject', 'Model'];
    const prompts = [
      {
        name: 'base',
        message: `Select the model's base class`,
        suffix: ':',
        type: 'list',
        default: 'Entity',
        choices: baseOptions,
      },
    ];

    return this.prompt(prompts).then(props => {
      Object.assign(this.artifactInfo, props);
      return props;
    });
  }

  beforePropPrompt() {
    this.log(
      `\nLet's add some properties to the ${chalk.yellow(
        utils.toClassName(this.artifactInfo.name)
      )} model.\n`
    );
  }

  promptPropertyName() {
    this.property = {};
    const prompts = [
      {
        name: 'name',
        type: 'input',
        message: 'Property name',
        suffix: ':',
        validate: utils.validateClassName,
      },
    ];

    this.log(`Enter an empty property name when done.`);
    return this.prompt(prompts).then(props => {
      Object.assign(this.property, props);
      return props;
    });
  }

  promptPropertyInfo() {
    if (!this.property.name) return;

    const propertyTypes = [
      'string',
      'number',
      'boolean',
      'object',
      'array',
      'date',
      'buffer',
      'any',
    ];

    const noDefaultValueTypes = ['buffer'];

    const prompts = [
      {
        name: 'type',
        type: 'choice',
        message: 'Property type',
        suffix: ':',
        choices: propertyTypes,
      },
      {
        name: 'required',
        type: 'confirm',
        message: 'Required?',
      },
      {
        name: 'default',
        type: 'input',
        message: `Default value ${chalk.dim('(leave blank for none)')}`,
        suffix: ':',
        default: null,
        when: function(answers) {
          return !noDefaultValueTypes.includes(answers.type);
        },
      },
      {
        name: 'id',
        type: 'confirm',
        message: 'Is Model ID?',
        when: function() {
          const isModelIDSet = false;
          this.artifactInfo.properties.forEach(prop => {
            if (prop.id) {
              isModelIDSet = true;
            }
          });
          return isModelIDSet;
        },
      },
    ];
  }
};
