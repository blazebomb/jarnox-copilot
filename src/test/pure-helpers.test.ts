import { expect } from 'chai';
import mock = require('mock-require');

// 1) Mock 'vscode' so importing your file doesn't crash in Node.
// We only need a minimal stub because we test pure helpers.
mock('vscode', {});

// 2) Import your module AFTER mocking vscode.
// Adjust the relative path to point to your file.
import * as mod from '../extension';

const t = (mod as any).__test__;

describe('Pure helper functions', () => {
  describe('commentPrefix', () => {
    it('returns "# " for python/shellscript/yaml', () => {
      expect(t.commentPrefix('python')).to.equal('# ');
      expect(t.commentPrefix('shellscript')).to.equal('# ');
      expect(t.commentPrefix('yaml')).to.equal('# ');
    });

    it('returns "<!-- " for html', () => {
      expect(t.commentPrefix('html')).to.equal('<!-- ');
    });

    it('returns "// " as default', () => {
      expect(t.commentPrefix('typescript')).to.equal('// ');
      expect(t.commentPrefix('javascript')).to.equal('// ');
      expect(t.commentPrefix('json')).to.equal('// ');
    });
  });

  describe('commentSuffix', () => {
    it('returns " -->" for html and empty for others', () => {
      expect(t.commentSuffix('html')).to.equal(' -->');
      expect(t.commentSuffix('python')).to.equal('');
      expect(t.commentSuffix('typescript')).to.equal('');
    });
  });

  describe('unwrapCodeFence', () => {
    it('returns inner code when wrapped in triple backticks with language', () => {
      const input = [
        '```ts',
        'const a = 1;',
        '```',
      ].join('\n');
      expect(t.unwrapCodeFence(input)).to.equal('const a = 1;');
    });

    it('returns inner code when wrapped in triple backticks without language', () => {
      const input = [
        '```',
        'console.log("x");',
        '```',
      ].join('\n');
      expect(t.unwrapCodeFence(input)).to.equal('console.log("x");');
    });

    it('trims when there is no fence', () => {
      expect(t.unwrapCodeFence('  let x = 2;  ')).to.equal('let x = 2;');
    });
  });

  describe('stripComments', () => {
    it('removes HTML and JS/TS comments and keeps code', () => {
      const input = [
        '<!-- hello -->',
        '/* block */',
        '// line',
        '# shell style',
        'const x = 1;   ',
        '',
        '',
        'const y = 2;',
      ].join('\n');

      const out = t.stripComments(input);
      expect(out).to.equal(['const x = 1;', 'const y = 2;'].join('\n'));
    });

    it('does not remove shebang lines', () => {
      const input = [
        '#!/usr/bin/env node',
        '# comment',
        'console.log(1);',
      ].join('\n');
      const out = t.stripComments(input);
      expect(out).to.equal(['#!/usr/bin/env node', 'console.log(1);'].join('\n'));
    });

    it('collapses multiple blank lines', () => {
      const input = 'const a=1;\n\n\nconst b=2;\n\n';
      const out = t.stripComments(input);
      expect(out).to.equal('const a=1;\nconst b=2;');
    });
  });

  describe('parseModelAction', () => {
    it('parses create_file action', () => {
      const text = 'random\n{"action":"create_file","path":"src/new.ts","content":"export const x=1;"}\ntext';
      const act = t.parseModelAction(text);
      expect(act).to.deep.equal({
        action: 'create_file',
        path: 'src/new.ts',
        content: 'export const x=1;',
      });
    });

    it('parses append_file action', () => {
      const text = '{"action":"append_file","path":"README.md","content":"More docs"}';
      const act = t.parseModelAction(text);
      expect(act).to.deep.equal({
        action: 'append_file',
        path: 'README.md',
        content: 'More docs',
      });
    });

    it('parses insert_code action without path', () => {
      const text = '{"action":"insert_code","content":"let a=5;"}';
      const act = t.parseModelAction(text);
      expect(act).to.deep.equal({
        action: 'insert_code',
        content: 'let a=5;',
      });
    });

    it('returns null for invalid JSON or unsupported actions', () => {
      expect(t.parseModelAction('not json')).to.equal(null);
      expect(t.parseModelAction('{"action":"delete_file"}')).to.equal(null);
    });
  });
});
