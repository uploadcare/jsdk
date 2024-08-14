import { expect } from '@esm-bundle/chai';
import { withResolvers } from './withResolvers';

describe('withResolvers', () => {
  it('should return resolve, reject and promise', () => {
    const { resolve, reject, promise } = withResolvers();
    expect(resolve).to.be.a('function');
    expect(reject).to.be.a('function');
    expect(promise).to.be.instanceOf(Promise);
  });

  it('should resolve promise', async () => {
    const { resolve, promise } = withResolvers();
    resolve('resolved');
    expect(await promise).to.equal('resolved');
  });

  it('should reject promise', async () => {
    const { reject, promise } = withResolvers();
    reject(new Error('rejected'));
    try {
      await promise;
    } catch (error) {
      expect(error.message).to.equal('rejected');
    }
  });
});
