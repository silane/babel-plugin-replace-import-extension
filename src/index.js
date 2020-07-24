function transformExtension(filepath, extMapping) {
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
  
  for(let [origExt, newExt] of Object.entries(extMapping)) {
    if(filepath.endsWith(origExt)) {
      return filepath.slice(0, -origExt.length) + newExt;
    }
  }
  return filepath;
}


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
        
        source.value = transformExtension(source.value, extMapping);
      },
      // For re-exporting
      ExportNamedDeclaration(path, state) {
        const extMapping = getOption(state, 'extMapping');
        if(!extMapping) {
          return;
        }
        const source = path.node.source;
        if(source == null) {
          return;
        }
        
        source.value = transformExtension(source.value, extMapping);
      },
      // For re-exporting
      ExportAllDeclaration(path, state) {
        const extMapping = getOption(state, 'extMapping');
        if(!extMapping) {
          return;
        }
        const source = path.node.source;
        if(source == null) {
          return;
        }
        
        source.value = transformExtension(source.value, extMapping);
      },
      // For dynamic import
      CallExpression(path, state) {
        // TODO: Implement dynamic import

        // const opts = state.opts || {};
        // const extMapping = opts.extMapping;
        // if(!extMapping) {
        //   return;
        // }
        // if(path.node.callee.type !== 'Import') {
        //   return;
        // }
        // const argument = path.node.arguments[0];
      },
    },
  };
}
