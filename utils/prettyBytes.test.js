import { expect } from '@esm-bundle/chai';
import { ByteUnitEnum, prettyBytes } from './prettyBytes';

const EXPECTED_BASE = 1000;

describe('prettyBytes', () => {
  describe('auto unit mode', () => {
    it('should be enabled by default', () => {
      expect(prettyBytes(EXPECTED_BASE ** 3)).to.equal('1 GB');
    });

    it('should print bytes if passed < 1 KB', () => {
      expect(prettyBytes(EXPECTED_BASE - 1)).to.equal(`${EXPECTED_BASE - 1} bytes`);
    });

    it('should print KB if passed >= 1 KB and < 1 MB', () => {
      expect(prettyBytes(EXPECTED_BASE ** 1)).to.equal('1 KB');
      expect(prettyBytes(EXPECTED_BASE ** 1 * (EXPECTED_BASE - 1))).to.equal(`${EXPECTED_BASE - 1} KB`);
    });

    it('should print MB if passed >= 1 MB and < 1 GB', () => {
      expect(prettyBytes(EXPECTED_BASE ** 2)).to.equal('1 MB');
      expect(prettyBytes(EXPECTED_BASE ** 2 * (EXPECTED_BASE - 1))).to.equal(`${EXPECTED_BASE - 1} MB`);
    });

    it('should print GB if passed >= 1 GB and < 1 TB', () => {
      expect(prettyBytes(EXPECTED_BASE ** 3)).to.equal('1 GB');
      expect(prettyBytes(EXPECTED_BASE ** 3 * (EXPECTED_BASE - 1))).to.equal(`${EXPECTED_BASE - 1} GB`);
    });

    it('should print TB if passed > 1 TB and < 1 PB', () => {
      expect(prettyBytes(EXPECTED_BASE ** 4)).to.equal('1 TB');
      expect(prettyBytes(EXPECTED_BASE ** 4 * (EXPECTED_BASE - 1))).to.equal(`${EXPECTED_BASE - 1} TB`);
    });

    it('should print PB if passed > 1 PB', () => {
      expect(prettyBytes(EXPECTED_BASE ** 5)).to.equal('1 PB');
      expect(prettyBytes(EXPECTED_BASE ** 5 * (EXPECTED_BASE - 1))).to.equal(`${EXPECTED_BASE - 1} PB`);
      expect(prettyBytes(EXPECTED_BASE ** 5 * EXPECTED_BASE)).to.equal(`${EXPECTED_BASE} PB`);
    });
  });

  describe('specified unit mode', () => {
    it('should print return bytes if specified bytes unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.BYTE)).to.equal('0 bytes');
      expect(prettyBytes(EXPECTED_BASE ** 1, ByteUnitEnum.BYTE)).to.equal(`${EXPECTED_BASE ** 1} bytes`);
      expect(prettyBytes(EXPECTED_BASE ** 5, ByteUnitEnum.BYTE)).to.equal(`${EXPECTED_BASE ** 5} bytes`);
    });

    it('should print KB if specified KB unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.KB)).to.equal('0 KB');

      expect(prettyBytes(EXPECTED_BASE ** 1 / 2, ByteUnitEnum.KB)).to.equal('0.5 KB');
      expect(prettyBytes(EXPECTED_BASE ** 2, ByteUnitEnum.KB)).to.equal(`${EXPECTED_BASE ** 1} KB`);
      expect(prettyBytes(EXPECTED_BASE ** 3, ByteUnitEnum.KB)).to.equal(`${EXPECTED_BASE ** 2} KB`);
    });

    it('should print MB if specified MB unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.MB)).to.equal('0 MB');

      expect(prettyBytes(EXPECTED_BASE ** 2 / 2, ByteUnitEnum.MB)).to.equal('0.5 MB');
      expect(prettyBytes(EXPECTED_BASE ** 3, ByteUnitEnum.MB)).to.equal(`${EXPECTED_BASE ** 1} MB`);
      expect(prettyBytes(EXPECTED_BASE ** 4, ByteUnitEnum.MB)).to.equal(`${EXPECTED_BASE ** 2} MB`);
    });

    it('should print GB if specified GB unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.GB)).to.equal('0 GB');

      expect(prettyBytes(EXPECTED_BASE ** 3 / 2, ByteUnitEnum.GB)).to.equal('0.5 GB');
      expect(prettyBytes(EXPECTED_BASE ** 4, ByteUnitEnum.GB)).to.equal(`${EXPECTED_BASE ** 1} GB`);
      expect(prettyBytes(EXPECTED_BASE ** 5, ByteUnitEnum.GB)).to.equal(`${EXPECTED_BASE ** 2} GB`);
    });

    it('should print TB if specified TB unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.TB)).to.equal('0 TB');

      expect(prettyBytes(EXPECTED_BASE ** 4 / 2, ByteUnitEnum.TB)).to.equal('0.5 TB');
      expect(prettyBytes(EXPECTED_BASE ** 5, ByteUnitEnum.TB)).to.equal(`${EXPECTED_BASE ** 1} TB`);
      expect(prettyBytes(EXPECTED_BASE ** 6, ByteUnitEnum.TB)).to.equal(`${EXPECTED_BASE ** 2} TB`);
    });

    it('should print PB if specified PB unit', () => {
      expect(prettyBytes(0, ByteUnitEnum.PB)).to.equal('0 PB');

      expect(prettyBytes(EXPECTED_BASE ** 5 / 2, ByteUnitEnum.PB)).to.equal('0.5 PB');
      expect(prettyBytes(EXPECTED_BASE ** 6, ByteUnitEnum.PB)).to.equal(`${EXPECTED_BASE ** 1} PB`);
      expect(prettyBytes(EXPECTED_BASE ** 7, ByteUnitEnum.PB)).to.equal(`${EXPECTED_BASE ** 2} PB`);
    });
  });

  describe('rounding', () => {
    it('should round up to 2 decimal places if necessary', () => {
      expect(prettyBytes(EXPECTED_BASE)).to.equal('1 KB');
      expect(prettyBytes(EXPECTED_BASE * 1.5)).to.equal('1.5 KB');
      expect(prettyBytes(EXPECTED_BASE * 1.55)).to.equal('1.55 KB');
      expect(prettyBytes(EXPECTED_BASE * 1.555)).to.equal('1.56 KB');
    });
  });
});
