// @ts-check
import { expect } from '@esm-bundle/chai';
import { delay } from './delay';
import { waitForAttribute } from './waitForAttribute';

const TEST_ATTRIBUTE = 'test-attribute';

describe('waitForAttribute', () => {
  it('should resolve success false when timeout is over', async () => {
    const element = document.createElement('div');
    const promise = waitForAttribute({
      element,
      attribute: TEST_ATTRIBUTE,
      timeout: 10,
    });
    await delay(100);
    expect(await promise).to.be.eql({ success: false, attribute: TEST_ATTRIBUTE });
  });
  it('should resolve success true when attribute is set async', async () => {
    const element = document.createElement('div');
    const promise = waitForAttribute({
      element,
      attribute: TEST_ATTRIBUTE,
      timeout: 10,
    });
    element.setAttribute(TEST_ATTRIBUTE, 'test');
    await delay(100);
    expect(await promise).to.be.eql({ success: true, attribute: TEST_ATTRIBUTE, value: 'test' });
  });
  it('should resolve success true when attribute is set sync', async () => {
    const element = document.createElement('div');
    element.setAttribute(TEST_ATTRIBUTE, 'test');
    const promise = waitForAttribute({
      element,
      attribute: TEST_ATTRIBUTE,
      timeout: 10,
    });
    await delay(100);
    expect(await promise).to.be.eql({ success: true, attribute: TEST_ATTRIBUTE, value: 'test' });
  });
});
