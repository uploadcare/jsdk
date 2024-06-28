import { expect } from '@esm-bundle/chai';
import { parseShrink } from './parseShrink.js';

describe('parseShrink', () => {
  it('should be false', () => {
    expect(parseShrink()).to.false;
  });

  it('should be right', () => {
    const result = expect(parseShrink('1000x1000 100%'));

    result.to.have.property('quality', 1);
    result.to.have.property('size', 1000000);
  });

  it('should be right without quality', () => {
    const result = expect(parseShrink('1000x1000'));

    result.to.have.property('quality', undefined);
    result.to.have.property('size', 1000000);
  });

  it('should be warn, because size shrink more max size', () => {
    expect(parseShrink('268435456x268435456 100%')).to.false;
  });
});
