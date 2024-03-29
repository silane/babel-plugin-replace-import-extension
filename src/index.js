/*
   Copyright 2021 silane

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const { parseSync } = require('@babel/core');


function __transformExtension(filepath, extMapping) {
  if(!filepath.startsWith('./') && !filepath.startsWith('../')) {
    // Package import
    return filepath;
  }

  const idx = filepath.lastIndexOf('.');
  if(idx === -1 || filepath.includes('/', idx)) {
    // No extension
    const newExt = extMapping[''];
    if(newExt) {
      return filepath + newExt;
    }
    return filepath;
  }

  for(let [origExt, newExt] of Object.entries(extMapping).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    if(filepath.endsWith(origExt)) {
      return filepath.slice(0, -origExt.length) + newExt;
    }
  }
  return filepath;
}

const astTransformExtension = parseSync(
  `(${__transformExtension.toString()})`,
  { babelrc: false, configFile: false }
).program.body[0].expression;

const transFormExtensionInjections = new Set();

function getOption(state, key) {
  const opts = state.opts || {};
  return val = opts[key];
}


module.exports = function({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        const extMapping = getOption(state, 'extMapping');
        if(!extMapping) {
          return;
        }
        const source = path.node.source;

        source.value = __transformExtension(source.value, extMapping);
      },
      // For re-exporting
      'ExportNamedDeclaration|ExportAllDeclaration'(path, state) {
        const extMapping = getOption(state, 'extMapping');
        if(!extMapping) {
          return;
        }
        const source = path.node.source;
        if(source == null) {
          return;
        }

        source.value = __transformExtension(source.value, extMapping);
      },
      // For dynamic import
      CallExpression(path, state) {
        const opts = state.opts || {};
        const extMapping = opts.extMapping;
        if(!extMapping) {
          return;
        }
        if(!path.node.callee || path.node.callee.type !== 'Import') {
          return;
        }

        const astExtMapping = t.objectExpression(
          Object.entries(extMapping).map(x => t.objectProperty(
            t.stringLiteral(x[0]), t.stringLiteral(x[1])
          ))
        );

        const argument = path.get('arguments.0');

        // transform the string directly if it ends with an constant extension
        if (argument.type === 'StringLiteral' && /\.(\w+)$/.test(argument.node.value)) {
          argument.node.value = __transformExtension(argument.node.value, extMapping);
          return;
        }

        // find the top-level scope
        const programPath = path.findParent(path => path.isProgram());

        if (!transFormExtensionInjections.has(programPath)) {
          // inject at the the top-level scope
          programPath.unshiftContainer('body', astTransformExtension);
          transFormExtensionInjections.add(programPath);
        }

        // call the transform function
        argument.replaceWith(t.callExpression(
          t.identifier('__transformExtension'), [argument.node, astExtMapping]
        ));
      },
    },
  };
}
