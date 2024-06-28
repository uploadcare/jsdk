function normalize(...args) {
  return args.reduce((result, arg) => {
    if (typeof arg === 'string') {
      result[arg] = true;
      return result;
    }

    for (const token of Object.keys(arg)) {
      result[token] = arg[token];
    }

    return result;
  }, {});
}

export function classNames(...args) {
  const mapping = normalize(...args);
  return Object.keys(mapping)
    .reduce((result, token) => {
      if (mapping[token]) {
        result.push(token);
      }

      return result;
    }, [])
    .join(' ');
}

export function applyClassNames(element, ...args) {
  const mapping = normalize(...args);
  for (const token of Object.keys(mapping)) {
    element.classList.toggle(token, mapping[token]);
  }
}
