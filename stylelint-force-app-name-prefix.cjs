/**
 * Original code at https://github.com/SunHuawei/stylelint-force-app-name-prefix
 *
 * @author @SunHuawei What modified:
 *
 *   - Use `.lr-` prefix instead of `.lr `
 *   - Add support for tag prefixes: `lr-`
 */
const _ = require('lodash');
const stylelint = require('stylelint');

const ruleName = 'plugin/stylelint-force-app-name-prefix';

const optionsSchema = {
  appName: _.isString,
};

const messages = stylelint.utils.ruleMessages(ruleName, {
  invalid: (selector, appName) => `Selector "${selector}" is out of control, please wrap within .${appName}`,
  invalidKeyFrames: (keyframesName, appName) =>
    `Keyframes name "${keyframesName}" is out of control, please prefix with ${appName}-`,
  invalidFontFace: (fontFamily, appName) =>
    `Custom font-family "${fontFamily}" is out of control, please prefix with ${appName}-`,
});

function findTopParentSelector(node) {
  if (node.parent.type === 'root' || node.parent.type === 'atrule') {
    return node.selector;
  }
  return findTopParentSelector(node.parent);
}

function isInsideAtRule(node) {
  if (node.parent.type === 'atrule') {
    return true;
  }
  if (node.parent.type === 'root') {
    return false;
  }
  return findTopParentSelector(node.parent);
}

module.exports = stylelint.createPlugin(ruleName, (options) => (root, result) => {
  if (!options) return;
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: options,
    possible: optionsSchema,
  });
  if (!validOptions) return;

  const whiteList = [`.${options.appName}`, /^:.*/];

  root.walkAtRules('keyframes', (rule) => {
    const keyframesName = rule.params;

    if (keyframesName.indexOf(`${options.appName}-`) === -1) {
      stylelint.utils.report({
        ruleName: ruleName,
        result: result,
        node: rule,
        message: messages.invalidKeyFrames(keyframesName, options.appName),
      });
    }
  });

  root.walkAtRules('font-face', (rule) => {
    rule.walkDecls('font-family', (decl) => {
      if (decl.value.indexOf(`${options.appName}-`) === -1) {
        stylelint.utils.report({
          ruleName: ruleName,
          result: result,
          node: rule,
          message: messages.invalidFontFace(decl.value, options.appName),
        });
      }
    });
  });

  root.walkRules((rule) => {
    if (isInsideAtRule(rule)) return;
    const topParentSelector = findTopParentSelector(rule);
    if (
      whiteList.find((whiteRule) => {
        if (whiteRule instanceof RegExp) {
          return whiteRule.test(topParentSelector);
        }
        return whiteRule === topParentSelector;
      })
    ) {
      // in white list, skipped
      return;
    }

    if (
      topParentSelector.indexOf(`.${options.appName}-`) === 0 ||
      topParentSelector.indexOf(`${options.appName}-`) === 0
    ) {
      // good
    } else {
      stylelint.utils.report({
        ruleName: ruleName,
        result: result,
        node: rule,
        message: messages.invalid(rule.selector, options.appName),
      });
    }
  });
});

module.exports.ruleName = ruleName;
module.exports.messages = messages;
