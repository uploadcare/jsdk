import { expectNotType, expectType } from 'tsd';
import {
  ActivityBlock,
  EventMap,
  OutputCollectionErrorType,
  OutputCollectionState,
  OutputCollectionStatus,
  OutputError,
  OutputFileEntry,
  OutputFileErrorType,
  UploadCtxProvider,
} from '../../index.js';
import { useRef } from 'react';
import { UploadcareFile, UploadcareGroup } from '@uploadcare/upload-client';

const instance = new UploadCtxProvider();
instance.uploadCollection.size;
instance.setOrAddState('fileId', 'uploading');

const api = instance.getAPI();
api.addFileFromUrl('https://example.com/image.png');

instance.addEventListener('change', (e) => {
  expectType<EventMap['change']>(e);
});

const onChange = (e: EventMap['change']) => e;
instance.addEventListener('change', onChange);

instance.addEventListener('change', (e) => {
  const state = e.detail;

  expectType<OutputFileEntry<'failed'>[]>(state.failedEntries);
  expectType<OutputFileEntry<'uploading'>[]>(state.uploadingEntries);
  expectType<OutputFileEntry<'success'>[]>(state.successEntries);
  expectType<OutputFileEntry<'idle'>[]>(state.idleEntries);
  // group is optional here
  expectType<UploadcareGroup | null>(state.group);

  if (state.isSuccess) {
    expectType<'success'>(state.status);
    expectType<true>(state.isSuccess);
    expectType<false>(state.isFailed);
    expectType<false>(state.isUploading);
    expectType<[]>(state.errors);
    expectType<'success'>(state.allEntries[0].status);
  } else if (state.isFailed) {
    expectType<'failed'>(state.status);
    expectType<false>(state.isSuccess);
    expectType<true>(state.isFailed);
    expectType<false>(state.isUploading);
    expectType<OutputError<OutputCollectionErrorType>[]>(state.errors);
  } else if (state.isUploading) {
    expectType<'uploading'>(state.status);
    expectType<false>(state.isSuccess);
    expectType<false>(state.isFailed);
    expectType<true>(state.isUploading);
    expectType<[]>(state.errors);
  } else {
    expectType<'idle'>(state.status);
    expectType<false>(state.isSuccess);
    expectType<false>(state.isFailed);
    expectType<false>(state.isUploading);
    expectType<[]>(state.errors);
    expectType<'success' | 'idle'>(state.allEntries[0].status);
  }
});

instance.addEventListener('group-created', (e) => {
  const state = e.detail;

  // group is required here
  expectType<UploadcareGroup>(state.group);
});

instance.addEventListener('done-click', (e) => {
  const state = e.detail;

  expectType<OutputCollectionStatus>(state.status);
  expectType<UploadcareGroup | null>(state.group);
});

instance.addEventListener('file-added', (e) => {
  const state = e.detail;

  expectType<string>(state.internalId);
  expectType<boolean>(state.isImage);
  expectType<number>(state.size);
  expectType<string>(state.name);
  expectType<'idle'>(state.status);
  expectType<false>(state.isSuccess);
  expectType<false>(state.isFailed);
  expectType<false>(state.isUploading);
  expectType<false>(state.isRemoved);
  expectType<[]>(state.errors);
  expectType<null>(state.cdnUrl);
  expectType<null>(state.cdnUrlModifiers);
  expectType<null>(state.uuid);
  expectType<null>(state.fileInfo);
});

instance.addEventListener('file-removed', (e) => {
  const state = e.detail;

  expectType<string>(state.internalId);
  expectType<'removed'>(state.status);
  expectType<false>(state.isSuccess);
  expectType<false>(state.isFailed);
  expectType<false>(state.isUploading);
  expectType<true>(state.isRemoved);
  expectType<OutputError<OutputFileErrorType>[]>(state.errors);
  expectType<string | null>(state.cdnUrl);
  expectType<string | null>(state.cdnUrlModifiers);
  expectType<string | null>(state.uuid);
  expectType<UploadcareFile | null>(state.fileInfo);
});

instance.addEventListener('file-upload-failed', (e) => {
  const state = e.detail;

  expectType<string>(state.internalId);
  expectType<'failed'>(state.status);
  expectType<false>(state.isSuccess);
  expectType<true>(state.isFailed);
  expectType<false>(state.isUploading);
  expectType<false>(state.isRemoved);
  expectType<OutputError<OutputFileErrorType>[]>(state.errors);
  expectType<string | null>(state.cdnUrl);
  expectType<string | null>(state.cdnUrlModifiers);
  expectType<string | null>(state.uuid);
  expectType<UploadcareFile | null>(state.fileInfo);
});

instance.addEventListener('file-upload-start', (e) => {
  const state = e.detail;

  expectType<string>(state.internalId);
  expectType<'uploading'>(state.status);
  expectType<false>(state.isSuccess);
  expectType<false>(state.isFailed);
  expectType<true>(state.isUploading);
  expectType<false>(state.isRemoved);
  expectType<[]>(state.errors);
  expectType<null>(state.cdnUrl);
  expectType<null>(state.cdnUrlModifiers);
  expectType<null>(state.uuid);
  expectType<null>(state.fileInfo);
});

instance.addEventListener('file-upload-progress', (e) => {
  const state = e.detail;
  expectType<'uploading'>(state.status);
});

instance.addEventListener('file-upload-success', (e) => {
  const state = e.detail;

  expectType<string>(state.internalId);
  expectType<'success'>(state.status);
  expectType<true>(state.isSuccess);
  expectType<false>(state.isFailed);
  expectType<false>(state.isUploading);
  expectType<false>(state.isRemoved);
  expectType<[]>(state.errors);
  expectType<string>(state.cdnUrl);
  expectType<string>(state.cdnUrlModifiers);
  expectType<string>(state.uuid);
  expectType<UploadcareFile>(state.fileInfo);
});

instance.addEventListener('file-url-changed', (e) => {
  const state = e.detail;
  expectType<'success'>(state.status);
});

instance.addEventListener('common-upload-start', (e) => {
  const state = e.detail;
  expectType<'uploading'>(state.status);
});

instance.addEventListener('common-upload-failed', (e) => {
  const state = e.detail;
  expectType<'failed'>(state.status);
});

instance.addEventListener('common-upload-progress', (e) => {
  const state = e.detail;
  expectType<'uploading'>(state.status);
});

instance.addEventListener('common-upload-success', (e) => {
  const state = e.detail;
  expectType<'success'>(state.status);
});

instance.addEventListener('modal-close', (e) => {
  const payload = e.detail;
  expectType<void>(payload);
});

instance.addEventListener('modal-open', (e) => {
  const payload = e.detail;
  expectType<void>(payload);
});

instance.addEventListener('activity-change', (e) => {
  const payload = e.detail;
  expectType<(typeof ActivityBlock)['activities'][keyof (typeof ActivityBlock)['activities']] | null | (string & {})>(
    payload.activity,
  );
});

() => {
  const ref = useRef<InstanceType<UploadCtxProvider>>(null);
  return <uc-upload-ctx-provider ctx="ctx" ref={ref}></uc-upload-ctx-provider>;
};
