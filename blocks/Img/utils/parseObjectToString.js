export const parseObjectToString = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => {
      if (key === 'cdn-operations') {
        return value;
      }
      if (key === 'analytics') {
        return value;
      }

      return `${key}/${value}`;
    });
