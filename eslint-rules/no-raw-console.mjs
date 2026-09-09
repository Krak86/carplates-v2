/**
 * no-raw-console
 * Bans `console.*` in application code. Use the NestJS `Logger` in `apps/api`
 * and the thin `logger` wrapper in `apps/web`. CLI scripts (`scripts/**`) are
 * exempted in the flat config, since printing progress is their job.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noRawConsole = {
  meta: {
    type: 'suggestion',
    docs: { description: 'no raw console.* — use the logger for the package' },
    schema: [],
    messages: {
      raw: 'Raw console.{{method}} — use the NestJS Logger (api) or the logger wrapper (web).'
    }
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          context.report({ node, messageId: 'raw', data: { method: node.property.name } })
        }
      }
    }
  }
}
