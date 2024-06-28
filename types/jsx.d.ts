/// <reference types="react" />

type ConfigPlainType = import('./exported.js').ConfigPlainType;
type UploadCtxProvider = import('../index.js').UploadCtxProvider;
type Config = import('../index.js').Config;
type FileUploaderInline = import('../index.js').FileUploaderInline;
type FileUploaderRegular = import('../index.js').FileUploaderRegular;
type FileUploaderMinimal = import('../index.js').FileUploaderMinimal;
type FormInput = import('../index.js').FormInput;
type CloudImageEditorBlock = import('../index.js').CloudImageEditorBlock;
type CtxAttributes = {
  'ctx-name': string;
};
type CommonHtmlAttributes<T> = Partial<
  Pick<React.HTMLAttributes<T>, 'id' | 'children' | 'hidden'> & { class: React.HTMLAttributes<T>['className'] }
>;

type CustomElement<C, A> = React.DetailedHTMLProps<CommonHtmlAttributes<C>, C> & A;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type UntypedElement = any;

declare namespace JSX {
  interface IntrinsicElements {
    'lr-crop-frame': UntypedElement;
    'lr-editor-crop-button-control': UntypedElement;
    'lr-editor-filter-control': UntypedElement;
    'lr-editor-operation-control': UntypedElement;
    'lr-editor-image-cropper': UntypedElement;
    'lr-editor-image-fader': UntypedElement;
    'lr-editor-scroller': UntypedElement;
    'lr-editor-slider': UntypedElement;
    'lr-editor-toolbar': UntypedElement;
    'lr-lr-btn-ui': UntypedElement;
    'lr-line-loader-ui': UntypedElement;
    'lr-presence-toggle': UntypedElement;
    'lr-slider-ui': UntypedElement;
    'lr-icon': UntypedElement;
    'lr-img': UntypedElement;
    'lr-simple-btn': UntypedElement;
    'lr-start-from': UntypedElement;
    'lr-drop-area': UntypedElement;
    'lr-source-btn': UntypedElement;
    'lr-source-list': UntypedElement;
    'lr-file-item': UntypedElement;
    'lr-modal': UntypedElement;
    'lr-upload-list': UntypedElement;
    'lr-url-source': UntypedElement;
    'lr-camera-source': UntypedElement;
    'lr-progress-bar-common': UntypedElement;
    'lr-progress-bar': UntypedElement;
    'lr-external-source': UntypedElement;
    'lr-cloud-image-editor-activity': UntypedElement;
    'lr-cloud-image-editor-block': CustomElement<
      CloudImageEditorBlock,
      CtxAttributes & ({ uuid: string } | { 'cdn-url': string }) & Partial<{ tabs: string; 'crop-preset': string }>
    >;
    'lr-cloud-image-editor': CustomElement<CloudImageEditorBlock, JSX.IntrinsicElements['lr-cloud-image-editor-block']>;
    'lr-form-input': CustomElement<FormInput, CtxAttributes>;
    'lr-file-uploader-regular': CustomElement<FileUploaderRegular, CtxAttributes>;
    'lr-file-uploader-minimal': CustomElement<FileUploaderMinimal, CtxAttributes>;
    'lr-file-uploader-inline': CustomElement<FileUploaderInline, CtxAttributes>;
    'lr-upload-ctx-provider': CustomElement<InstanceType<UploadCtxProvider>, CtxAttributes>;
    'lr-config': CustomElement<InstanceType<Config>, CtxAttributes & Partial<ConfigPlainType>>;
  }
}
