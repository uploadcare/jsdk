import { expect } from '@esm-bundle/chai';
import { parseCdnUrl } from './parseCdnUrl';

describe('parseCdnUrl', () => {
  it('should should work', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/',
        cdnBase: 'https://cdn.example.com',
      }),
    ).to.deep.equal({
      uuid: '12345678-1234-5678-1234-567812345678',
      cdnUrlModifiers: '',
      filename: null,
    });
  });

  it('should parse filename', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/bar.jpg',
        cdnBase: 'https://cdn.example.com',
      }),
    ).to.deep.equal({
      uuid: '12345678-1234-5678-1234-567812345678',
      cdnUrlModifiers: '',
      filename: 'bar.jpg',
    });
  });

  it('should parse cdn url modifiers', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/-/foo/bar/baz.jpg',
        cdnBase: 'https://cdn.example.com',
      }),
    ).to.deep.equal({
      uuid: '12345678-1234-5678-1234-567812345678',
      cdnUrlModifiers: '-/foo/bar/',
      filename: 'baz.jpg',
    });
  });

  it('should return null if cdn base is different', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/',
        cdnBase: 'https://cdn2.example.com',
      }),
    ).to.equal(null);
  });

  it('should strip slashes from the end cdn base before comparing', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/',
        cdnBase: 'https://cdn.example.com/',
      }),
    ).to.deep.equal({
      uuid: '12345678-1234-5678-1234-567812345678',
      cdnUrlModifiers: '',
      filename: null,
    });
  });

  it('should not compare the protocol', () => {
    expect(
      parseCdnUrl({
        url: 'https://cdn.example.com/12345678-1234-5678-1234-567812345678/',
        cdnBase: 'http://cdn.example.com',
      }),
    ).to.deep.equal({
      uuid: '12345678-1234-5678-1234-567812345678',
      cdnUrlModifiers: '',
      filename: null,
    });
  });
});
