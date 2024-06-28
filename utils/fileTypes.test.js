import { expect } from '@esm-bundle/chai';
import { fileIsImage, isBlob, isFile, matchExtension, matchMimeType, mergeFileTypes } from './fileTypes';

describe('mergeFileTypes', () => {
  it('should join input strings with comma', () => {
    expect(mergeFileTypes(['text/html,text/plain', 'image/*,image/heic', 'text/markdown'])).to.eql([
      'text/html',
      'text/plain',
      'image/*',
      'image/heic',
      'text/markdown',
    ]);
  });

  it('should skip empty values', () => {
    expect(mergeFileTypes()).to.eql([]);
    expect(mergeFileTypes(['text/html', '', undefined, 'text/plain'])).to.eql(['text/html', 'text/plain']);
  });

  it('should trim values', () => {
    expect(mergeFileTypes([' text/html , text/plain ', ' image/*, image/heic ', ' text/markdown '])).to.eql([
      'text/html',
      'text/plain',
      'image/*',
      'image/heic',
      'text/markdown',
    ]);
  });
});

describe('matchMimeType', () => {
  it('should return true if file type is exactly matched', () => {
    expect(matchMimeType('image/jpeg', ['image/jpeg'])).to.be.true;
  });
  it('should return true if file type is wildcard matched', () => {
    expect(matchMimeType('image/jpeg', ['image/*'])).to.be.true;
  });
  it('should return false if file type is not matched', () => {
    expect(matchMimeType('text/plain', ['image/*'])).to.be.false;
  });
});

describe('matchExtension', () => {
  it('should return true if file extension is exactly matched', () => {
    expect(matchExtension('image.jpeg', ['.jpeg'])).to.be.true;
    expect(matchExtension('image.avif', ['.avif'])).to.be.true;
  });
  it('should return false if file extension is not matched', () => {
    expect(matchExtension('image.jpeg', ['.png'])).to.be.false;
    expect(matchExtension('image.avifs', ['.avif'])).to.be.false;
  });
  it('should be case insensitive', () => {
    expect(matchExtension('image.PNG', ['.png'])).to.be.true;
  });
});

describe('fileIsImage', () => {
  it('should return true if file is image', () => {
    const file = new File([''], 'name', { type: 'image/jpeg' });
    expect(fileIsImage(file)).to.be.true;
  });
  it('should return false if file is not image', () => {
    const file = new File([''], 'name', { type: 'text/plain' });
    expect(fileIsImage(file)).to.be.false;
  });
});

describe('isBlob', () => {
  it('should return true if Blob is passed', () => {
    expect(isBlob(new Blob(['']))).to.be.true;
  });
  it('should return true if File is passed', () => {
    expect(isBlob(new File([''], 'test.txt'))).to.be.true;
  });
  it('should return false if something else passed', () => {
    expect(isBlob('test')).to.be.false;
    expect(isBlob({ uri: 'test' })).to.be.false;
  });
});
describe('isFile', () => {
  it('should return true if File is passed', () => {
    expect(isFile(new File([''], 'test.txt'))).to.be.true;
  });
  it('should return false if something else passed', () => {
    expect(isFile(new Blob(['']))).to.be.false;
    expect(isFile('test')).to.be.false;
    expect(isFile({ uri: 'test' })).to.be.false;
  });
});
