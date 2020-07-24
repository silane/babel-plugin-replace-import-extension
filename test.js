const babel = require('@babel/core');
const pluginCommonjs = require('@babel/plugin-transform-modules-commonjs');
const plugin = require('./src/index.js');


function transform(input, options) {
  return babel.transform(input, {
    plugins: [[plugin, options], pluginCommonjs],
  }).code;
}

describe('src/index.js', () => {
  test('extension is correctly replaced without CommonJS translation', () => {
    const input = 'import foo from "./foo.js";';
    const options = { extMapping: { '.js': '.cjs', '.sj': '.sjc' } };
    const code = babel.transform(input, { plugins: [[plugin, options]] }).code;
    expect(code).toContain('import foo from "./foo.cjs"');
  });

  test('extension is correctly replaced', () => {
    const input = 'import foo from "./foo.js";';
    const options = { extMapping: { '.js': '.cjs', '.sj': '.sjc' } };
    const code = transform(input, options);
    expect(code).toContain('require("./foo.cjs")');
  });

  test('extension is correctly added', () => {
    const input = 'import foo from "./foo";';
    const options = { extMapping: { '': '.ext', '.foo': '.bar' } };
    const code = transform(input, options);
    expect(code).toContain('require("./foo.ext")');
  });

  test('extension is correctly removed', () => {
    const input = 'import foo from "./foo.abc";';
    const options = { extMapping: { '.abc': '', '.def': '.ghi' } };
    const code = transform(input, options);
    expect(code).toContain('require("./foo")');
  });

  test('extension is not changed when there is no mapping', () => {
    const input = 'import foo from "./module.foo";';
    const options = { extMapping: {
      '.bar': '.foobar', '.fo': '.foba', '.o': '.fb',
    }};
    const code = transform(input, options);
    expect(code).toContain('require("./module.foo")');
  });

  test('extension is not changed when not relative path', () => {
    const input = 'import foo from "package.foo";';
    const options = { extMapping: { '.foo': '.bar' } };
    const code = transform(input, options);
    expect(code).toContain('require("package.foo")');
  });

  test('extension in "named re-export" statement is changed', () => {
    const input = 'export { foo } from "./module.ext";';
    const options = { extMapping: { '.ext': '.mjs' } };
    const code = transform(input, options);
    expect(code).toContain('require("./module.mjs")');
  });

  test('extension in "re-export all" statement is changed', () => {
    const input = 'export * from "./module.ext";';
    const options = { extMapping: { '.ext': '.mjs' } };
    const code = transform(input, options);
    expect(code).toContain('require("./module.mjs")');
  });

  test.skip('extension in dynamic import is changed', () => {
    const input = 'import("./module.ext");';
    const options = { extMapping: { '.ext': '.mjs' } };
    let code = transform(input, options);
    code = code.replace('import(', 'import_(');
    const mock = jest.fn();
    new Function('import_', code)(mock);
    expect(mock.mock.calls).toBe([["./module.mjs"]]);
  });

  test('can handle multiple dot extension correctly', () => {
    const input = 'export * from "./module.zzz.aaa";';
    const options = { extMapping: { '.aaa': '.a', '.zzz.aaa': '.z' } };
    const code = transform(input, options);
    expect(code).toContain('require("./module.z")');
  });
});
