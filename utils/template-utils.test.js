import { expect } from '@esm-bundle/chai';
import { applyTemplateData, getPluralObjects } from './template-utils.js';

describe('template-utils', () => {
  describe('applyTemplateData', () => {
    it('should return the same string if no variables passed', () => {
      const result = applyTemplateData('Hello world!');
      expect(result).to.equal('Hello world!');
    });

    it('should replace variables', () => {
      const result = applyTemplateData("Hello world! My name is {{name}}. I'm {{age}} years old.", {
        name: 'John Doe',
        age: 12,
      });
      expect(result).to.equal("Hello world! My name is John Doe. I'm 12 years old.");
    });

    it('should work with variables at start/end', () => {
      const result = applyTemplateData("{{name}} my name is. I'm {{age}}", { name: 'John Doe', age: 12 });
      expect(result).to.equal("John Doe my name is. I'm 12");
    });

    it('should work with single variable', () => {
      const result = applyTemplateData('{{name}}', { name: 'John Doe' });
      expect(result).to.equal('John Doe');
    });

    it('should not replace non-defined variabled', () => {
      const result = applyTemplateData('My name is {{name}}');
      expect(result).to.equal('My name is {{name}}');
    });

    it('should accept `transform` option', () => {
      const result = applyTemplateData(
        'My name is {{name}}',
        { name: 'John Doe' },
        { transform: (value) => value.toUpperCase() },
      );
      expect(result).to.equal('My name is JOHN DOE');
    });
  });

  describe('getPluralObjects', () => {
    it('should return array of plural objects', () => {
      expect(
        getPluralObjects(
          'Uploading {{filesCount}} {{plural:file(filesCount)}} with {{errorsCount}} {{plural:error(errorsCount)}}',
        ),
      ).to.deep.equal([
        { variable: 'plural:file(filesCount)', pluralKey: 'file', countVariable: 'filesCount' },
        { variable: 'plural:error(errorsCount)', pluralKey: 'error', countVariable: 'errorsCount' },
      ]);
    });
  });
});
