export class CustomError extends Error {
  constructor(name: string | undefined, message: string)
  constructor(message: string)
  constructor(...args: string[]) {
    super(args.pop())
    if (args[0]) this.name = `${args[0]}Error`
  }
}

export const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)
