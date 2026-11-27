import { ConsoleLogger, type LogLevel } from '@nestjs/common'
import { redactLogText, redactLogValue } from '@carplates/shared'

/**
 * `ConsoleLogger` that masks plates, VINs, e-mails, IPs and secrets before anything is printed, so the raw Docker
 * json-file logs are clean too (`docs/logs-plan.md`; Vector masks again for the other containers).
 */
export class RedactingLogger extends ConsoleLogger {
  protected override printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown
  ): void {
    super.printMessages(
      messages.map(redactLogValue),
      redactLogText(context),
      logLevel,
      writeStreamType,
      typeof errorStack === 'string' ? redactLogText(errorStack) : errorStack
    )
  }

  protected override printStackTrace(stack: string): void {
    // Nest passes `undefined` for an exception without a stack (e.g. an HttpException); redacting it threw inside the
    // exception filter and replaced the real error (a 502) with a crash.
    super.printStackTrace(typeof stack === 'string' ? redactLogText(stack) : stack)
  }
}
