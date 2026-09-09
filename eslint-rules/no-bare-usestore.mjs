/**
 * no-bare-usestore
 * A zero-arg call to a Zustand store hook (`useAppStore()`, `useStore()`, …)
 * subscribes the component to the whole store and re-renders on every field
 * change. Always pass a selector: `useAppStore(s => s.lang)`.
 */
const STORE_HOOK_RE = /^use[A-Z]\w*Store$/

/** @type {import('eslint').Rule.RuleModule} */
export const noBareUseStore = {
  meta: {
    type: 'problem',
    docs: { description: 'Zustand store hooks must be called with a selector' },
    schema: [],
    messages: {
      bare: 'Pass a selector to {{name}}() — a bare call re-renders on every store change.'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node
        if (callee.type === 'Identifier' && STORE_HOOK_RE.test(callee.name) && node.arguments.length === 0) {
          context.report({ node, messageId: 'bare', data: { name: callee.name } })
        }
      }
    }
  }
}
