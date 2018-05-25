const prettier = require('prettier');
const defaultOptions = require('rc')('prettier');

delete defaultOptions._;
delete defaultOptions.configs;
delete defaultOptions.config;

module.exports = function(codeString, options) {
  options = Object.assign(defaultOptions, options);
  return prettier.format(codeString, {parser: 'typescript', ...options});
};
