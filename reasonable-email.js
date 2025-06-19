/**
 * Practical email validation regular expression from zod
 * https://colinhacks.com/essays/reasonable-email-regex
 * https://github.com/colinhacks/zod/blob/ee5615d76b93aac15d7428a17b834a062235f6a1/packages/zod/src/v4/core/regexes.ts#L24
 * Couldn't figure out the maze of exports in zod so I just vedored the regex directly.
 *
 * @type {RegExp} Regular expression for validating reasonable email addresses
 */
export const reasonableEmail =
   // eslint-disable-next-line no-useless-escape
   /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/
