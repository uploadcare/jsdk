// @ts-check
// Symbiote.js
export { BaseComponent, Data, UID } from '@symbiotejs/symbiote';

// Abstract:
export { Block } from './abstract/Block.js';
export { SolutionBlock } from './abstract/SolutionBlock.js';
export { ActivityBlock } from './abstract/ActivityBlock.js';
export { UploaderBlock } from './abstract/UploaderBlock.js';
export { Config } from './blocks/Config/Config.js';

// Blocks:
export { Icon } from './blocks/Icon/Icon.js';
export { Img } from './blocks/Img/Img.js';
export { SimpleBtn } from './blocks/SimpleBtn/SimpleBtn.js';
export { StartFrom } from './blocks/StartFrom/StartFrom.js';
export { DropArea } from './blocks/DropArea/DropArea.js';
export { SourceBtn } from './blocks/SourceBtn/SourceBtn.js';
export { SourceList } from './blocks/SourceList/SourceList.js';
export { FileItem } from './blocks/FileItem/FileItem.js';
export { Modal } from './blocks/Modal/Modal.js';
export { UploadList } from './blocks/UploadList/UploadList.js';
export { UrlSource } from './blocks/UrlSource/UrlSource.js';
export { CameraSource } from './blocks/CameraSource/CameraSource.js';
export { UploadCtxProvider } from './blocks/UploadCtxProvider/UploadCtxProvider.js';
export { ProgressBarCommon } from './blocks/ProgressBarCommon/ProgressBarCommon.js';
export { ProgressBar } from './blocks/ProgressBar/ProgressBar.js';
export * from './blocks/CloudImageEditor/index.js';
export { CloudImageEditorActivity } from './blocks/CloudImageEditorActivity/CloudImageEditorActivity.js';
export { ExternalSource } from './blocks/ExternalSource/ExternalSource.js';
export { FormInput } from './blocks/FormInput/FormInput.js';
export { ActivityHeader } from './blocks/ActivityHeader/ActivityHeader.js';
export { Select } from './blocks/Select/Select.js';
export { Copyright } from './blocks/Copyright/Copyright.js';

// Solutions:
export { FileUploaderRegular } from './solutions/file-uploader/regular/FileUploaderRegular.js';
export { FileUploaderMinimal } from './solutions/file-uploader/minimal/FileUploaderMinimal.js';
export { FileUploaderInline } from './solutions/file-uploader/inline/FileUploaderInline.js';
export { CloudImageEditor } from './solutions/cloud-image-editor/CloudImageEditor.js';

// Utils:
export { registerBlocks } from './abstract/registerBlocks.js';
export { defineLocale } from './abstract/localeRegistry.js';
export { connectBlocksFrom } from './abstract/connectBlocksFrom.js';
export { toKebabCase } from './utils/toKebabCase.js';

export * from './env.js';

export * from './types/index.js';
