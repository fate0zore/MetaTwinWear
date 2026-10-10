import type { LoginInput } from '../types'

/** 验证演示登录表单并返回当前会话账号。 */
export const authService = {
  async login(input: LoginInput): Promise<{ account: string }> {
    const account = input.account.trim()
    const password = input.password.trim()
    if (!account || !password) throw new Error('请输入账号和密码。')
    return { account }
  },
}
