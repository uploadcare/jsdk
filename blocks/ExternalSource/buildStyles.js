// @ts-check

/**
 * @param {Record<string, Record<string, string>>} style
 * @returns
 */
const styleToCss = (style) => {
  const css = Object.keys(style).reduce((acc, selector) => {
    const propertiesObj = style[selector];
    const propertiesStr = Object.keys(propertiesObj).reduce((acc, prop) => {
      const value = propertiesObj[prop];
      return `${acc}${prop}: ${value};`;
    }, '');
    return `${acc}${selector}{${propertiesStr}}`;
  }, '');
  return css;
};

/**
 * @param {{
 *   textColor: string;
 *   backgroundColor: string;
 *   linkColor: string;
 *   linkColorHover: string;
 *   secondaryColor: string;
 *   secondaryHover: string;
 *   secondaryForegroundColor: string;
 *   fontFamily: string;
 *   fontSize: string;
 *   radius: string;
 * }} options
 */
export function buildStyles({
  textColor,
  backgroundColor,
  linkColor,
  linkColorHover,
  secondaryColor,
  secondaryHover,
  secondaryForegroundColor,
  fontFamily,
  fontSize,
  radius,
}) {
  const border = `solid 1px ${secondaryColor}`;

  // TODO: we need to update source source styles, add css custom properties to control theme
  return styleToCss({
    body: {
      color: textColor,
      'background-color': backgroundColor,
      'font-family': fontFamily,
      'font-size': fontSize,
    },
    '.side-bar': {
      background: 'inherit',
      'border-right': border,
    },
    '.main-content': {
      background: 'inherit',
    },
    '.main-content-header': {
      background: 'inherit',
    },
    '.main-content-footer': {
      background: 'inherit',
    },
    '.list-table-row': {
      color: 'inherit',
    },
    '.list-table-row:hover': {
      background: secondaryColor,
    },
    '.list-table-row .list-table-cell-a, .list-table-row .list-table-cell-b': {
      'border-top': border,
    },
    '.list-table-body .list-items': {
      'border-bottom': border,
    },
    '.bread-crumbs a': {
      color: linkColor,
    },
    '.bread-crumbs a:hover': {
      color: linkColorHover,
    },
    '.main-content.loading': {
      background: `${backgroundColor} url(/static/images/loading_spinner.gif) center no-repeat`,
      'background-size': '25px 25px',
    },
    '.list-icons-item': {
      'background-color': secondaryColor,
    },
    '.source-gdrive .side-bar-menu a, .source-gphotos .side-bar-menu a': {
      color: linkColor,
    },
    '.source-gdrive .side-bar-menu a, .source-gphotos .side-bar-menu a:hover': {
      color: linkColorHover,
    },
    '.side-bar-menu a': {
      color: linkColor,
    },
    '.side-bar-menu a:hover': {
      color: linkColorHover,
    },
    '.source-gdrive .side-bar-menu .current, .source-gdrive .side-bar-menu a:hover, .source-gphotos .side-bar-menu .current, .source-gphotos .side-bar-menu a:hover':
      {
        color: linkColorHover,
      },
    '.source-vk .side-bar-menu a': {
      color: linkColor,
    },
    '.source-vk .side-bar-menu a:hover': {
      color: linkColorHover,
      background: 'none',
    },
    'input[type=submit], .button, button': {
      color: secondaryForegroundColor,
      background: secondaryColor,
      'box-shadow': 'none',
      border: 'none',
      'border-radius': radius,
    },
    'input[type=submit]:hover, .button:hover, button:hover': {
      background: secondaryHover,
    },
    '.text-field, input[type=search], input[type=text], input[type=url], textarea': {
      color: secondaryForegroundColor,
      'border-radius': radius,
      background: secondaryColor,
      border,
    },
  });
}
