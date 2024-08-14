() => <uc-config ctx="my-uploader" />;
() => <uc-config ctx-name="my-uploader" />;

// @ts-expect-error - should fall when both ctx and ctx-name are provided
() => <uc-config ctx-name="my-uploader" ctx="another-ctx" />;
