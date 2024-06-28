import { expect } from '@esm-bundle/chai';
import { spy } from 'sinon';
import { memoize } from './memoize.js';

describe('memoize', () => {
  it('should cache result', () => {
    let counter = 0;
    const fn = spy(() => counter++);
    const memoized = memoize(fn);
    memoized();
    memoized();
    memoized();
    expect(fn.callCount).to.equal(1);
  });

  it('should cache result for each set of arguments', () => {
    const fn = spy((a, b) => {
      return a + b;
    });
    const memoized = memoize(fn);

    memoized(1, 2);
    memoized(1, 2);
    memoized(1, 2);
    memoized(2, 3);
    memoized(2, 3);
    memoized(2, 3);
    expect(fn.callCount).to.equal(2);
  });

  it('should return the same result as original function', () => {
    const fn = (a, b) => a + b;
    const memoized = memoize(fn);
    expect(memoized(1, 2)).to.equal(fn(1, 2));
    expect(memoized(2, 3)).to.equal(fn(2, 3));
    expect(memoized(3, 4)).to.equal(fn(3, 4));
  });
});
