// @ts-expect-error - no props
() => <uc-cloud-image-editor />;

// @ts-expect-error - no cdn-src or uuid
() => <uc-cloud-image-editor ctx="my-uploader" />;

// @ts-expect-error - css-src forbidden
() => <uc-cloud-image-editor css-src="url" />;

() => <uc-cloud-image-editor ctx="my-editor" css-src="url" uuid="123124" />;
() => <uc-cloud-image-editor ctx="my-editor" css-src="url" uuid="123124" tabs="tab" crop-preset="preset" />;
() => <uc-cloud-image-editor ctx="my-editor" css-src="url" cdn-url="url" />;
