import { expect } from '@esm-bundle/chai';
import { getPluralForm } from './getPluralForm';

describe('getPluralForm', () => {
  it('should return selected form for es-US', () => {
    expect(getPluralForm('en-US', 1)).to.equal('one');
    expect(getPluralForm('en-US', 2)).to.equal('other');
  });

  it('should return selected form for ru-RU', () => {
    expect(getPluralForm('ru-RU', 1)).to.equal('one');
    expect(getPluralForm('ru-RU', 2)).to.equal('few');
    expect(getPluralForm('ru-RU', 5)).to.equal('many');
    expect(getPluralForm('ru-RU', 1.5)).to.equal('other');
  });
});
