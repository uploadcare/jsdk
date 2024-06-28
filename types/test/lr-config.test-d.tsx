import React from 'react';
import { expectType } from 'tsd';
import '../jsx.js';
import type { FuncCollectionValidator, FuncFileValidator, OutputFileEntry } from '../index.js';

// @ts-expect-error untyped props
() => <lr-config ctx-name="1" something="wrong" />;

// @ts-expect-error missing ctx-name
() => <lr-config />;

// allow common html attributes and required ctx-name
() => <lr-config ctx-name="1" id="1" class="1" hidden />;

// allow key prop
() => <lr-config ctx-name="1" key={1} />;

// allow useRef hook
() => {
  const ref = React.useRef<InstanceType<Config> | null>(null);
  expectType<InstanceType<Config> | null>(ref.current);
  <lr-config ctx-name="1" ref={ref} />;
};

// allow callback ref
() => {
  <lr-config
    ctx-name="1"
    ref={(el) => {
      expectType<InstanceType<Config> | null>(el);
    }}
  />;
};

// allow createRef
() => {
  const ref = React.createRef<InstanceType<Config>>();
  expectType<InstanceType<Config> | null>(ref.current);
  <lr-config ctx-name="1" ref={ref} />;
};

// accept config attributes
() => <lr-config ctx-name="1" multiple multipleMax={1} multipleMin={2} accept="str" />;

// allow to use DOM properties
() => {
  const ref = React.useRef<InstanceType<Config> | null>(null);
  if (ref.current) {
    const config = ref.current;
    config.metadata = { foo: 'bar' };
    config.secureSignature = '1231';
    config.multiple = true;
  }
};

// allow to pass metadata
() => {
  const ref = React.useRef<InstanceType<Config> | null>(null);
  if (ref.current) {
    const config = ref.current;
    config.metadata = { foo: 'bar' };
    config.metadata = () => ({ foo: 'bar' });
    config.metadata = async (entry) => {
      expectType<OutputFileEntry>(entry);
      return { foo: 'bar' };
    };
  }
};

// allow to pass validators
() => {
  const ref = React.useRef<InstanceType<Config> | null>(null);
  if (ref.current) {
    const config = ref.current;

    const maxSize: FuncFileValidator = (outputEntry, block) => ({
      message: block.l10n('images-only-accepted'),
      payload: { entry: outputEntry },
    });

    const maxCollection: FuncCollectionValidator = (collection, block) => ({
      message: block.l10n('some-files-were-not-uploaded'),
    });

    config.fileValidators = [maxSize];
    config.collectionValidators = [maxCollection];
  }
};
