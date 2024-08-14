import React from 'react';
import { expectType } from 'tsd';
import '../jsx.js';
import { OutputFileEntry, FuncCollectionValidator, FuncFileValidator } from '../index.js';

// @ts-expect-error untyped props
() => <uc-config ctx="1" something="wrong"></uc-config>;

// @ts-expect-error missing ctx
() => <uc-config></uc-config>;

// allow common html attributes and required ctx
() => <uc-config ctx="1" id="1" class="1" hidden></uc-config>;

// allow key prop
() => <uc-config ctx="1" key={1}></uc-config>;

// allow useRef hook
() => {
  const ref = React.useRef<InstanceType<Config> | null>(null);
  expectType<InstanceType<Config> | null>(ref.current);
  <uc-config ctx="1" ref={ref}></uc-config>;
};

// allow callback ref
() => {
  <uc-config
    ctx="1"
    ref={(el) => {
      expectType<InstanceType<Config> | null>(el);
    }}
  ></uc-config>;
};

// allow createRef
() => {
  const ref = React.createRef<InstanceType<Config>>();
  expectType<InstanceType<Config> | null>(ref.current);
  <uc-config ctx="1" ref={ref}></uc-config>;
};

// accept config attributes
() => <uc-config ctx="1" multiple multipleMax={1} multipleMin={2} accept="str" />;

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

    const maxSize: FuncFileValidator = (outputEntry, api) => ({
      message: api.l10n('images-only-accepted'),
      payload: { entry: outputEntry },
    });

    const maxCollection: FuncCollectionValidator = (collection, api) => ({
      message: api.l10n('some-files-were-not-uploaded'),
    });

    config.fileValidators = [maxSize];
    config.collectionValidators = [maxCollection];
  }
};
