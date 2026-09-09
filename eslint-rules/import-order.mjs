/**
 * no-external-after-internal
 * Warns when an external package import appears after an internal one
 * (`@/…` alias or a `@carplates/*` workspace package or a relative path).
 * Keeps every file's import block in the order: external → internal → styles.
 */
// "internal" = this package's own source (the @/ alias or a relative path).
// Workspace packages (@carplates/*) group with third-party deps.
const isInternal = source => source.startsWith('@/') || source.startsWith('.')

const isStyle = source => /\.(css|scss|sass|less)$/.test(source)

/** @type {import('eslint').Rule.RuleModule} */
export const noExternalAfterInternal = {
  meta: {
    type: 'suggestion',
    docs: { description: 'external imports must precede internal (@/, workspace, relative) imports' },
    schema: [],
    messages: {
      order: 'External import "{{source}}" appears after an internal import — move external packages first.'
    }
  },
  create(context) {
    let seenInternal = false
    return {
      ImportDeclaration(node) {
        const source = node.source.value
        // side-effect imports (import './x') are often position-sensitive — skip
        if (typeof source !== 'string' || isStyle(source) || node.specifiers.length === 0) return
        if (isInternal(source)) {
          seenInternal = true
          return
        }
        if (seenInternal) {
          context.report({ node, messageId: 'order', data: { source } })
        }
      }
    }
  }
}
