/**
 * Date of the newest `RELEASES` day, injected at build time from the newest month file (`latest-release-date.ts`), so
 * there is nothing to bump. Lives apart from the log so the header bell can tell "unread" without pulling a lazy
 * releases chunk. Restart the dev server after adding a day (`define` is read once).
 */
export const LATEST_RELEASE_DATE: string = __LATEST_RELEASE_DATE__
